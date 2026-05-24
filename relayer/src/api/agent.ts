import Groq from 'groq-sdk'
import { createPublicClient, createWalletClient, http, parseAbiItem, parseUnits, formatUnits, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [process.env.ARC_RPC || 'https://rpc.testnet.arc.network'] } },
  testnet: true,
})
import { getDb } from '../db/index.js'
import { createLogger } from '../utils/logger.js'
import type { IncomingMessage, ServerResponse } from 'http'
import type { RelayerConfig } from '../config.js'

const ERC8183_ADDRESS = '0x0747EEf0706327138c69792bF28Cd525089e4583' as const
const ERC8183_USDC    = '0x3600000000000000000000000000000000000000' as const
const ZERO_ADDR       = '0x0000000000000000000000000000000000000000' as const
const ARC_CHAIN_ID = 5042002
const arcClient = createPublicClient({ chain: arcTestnet, transport: http() })

const JOB_ABI = [
  { type: 'function', name: 'createJob', stateMutability: 'nonpayable',
    inputs: [
      { name: 'provider',    type: 'address' },
      { name: 'evaluator',   type: 'address' },
      { name: 'expiredAt',   type: 'uint256' },
      { name: 'description', type: 'string'  },
      { name: 'hook',        type: 'address' },
    ],
    outputs: [{ name: 'jobId', type: 'uint256' }] },
  { type: 'function', name: 'setBudget', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'optParams', type: 'bytes' }],
    outputs: [] },
  { type: 'function', name: 'fund', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'optParams', type: 'bytes' }],
    outputs: [] },
  { type: 'function', name: 'submit', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'deliverable', type: 'bytes32' }, { name: 'optParams', type: 'bytes' }],
    outputs: [] },
  { type: 'function', name: 'complete', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'reason', type: 'bytes32' }, { name: 'optParams', type: 'bytes' }],
    outputs: [] },
  { type: 'function', name: 'getJob', stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'id', type: 'uint256' }, { name: 'client', type: 'address' }, { name: 'provider', type: 'address' },
      { name: 'evaluator', type: 'address' }, { name: 'description', type: 'string' }, { name: 'budget', type: 'uint256' },
      { name: 'expiredAt', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'hook', type: 'address' },
    ]}] },
] as const

const USDC_APPROVE_ABI = [
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }] },
] as const

const logger = createLogger('api:agent')

const MODEL = 'llama-3.3-70b-versatile'

const SYSTEM_PROMPT = `You are the Cadence Payment Agent — an AI registered onchain (ERC-8004) that manages autonomous USDC subscription payments on Arc.

Arc blockchain advantages:
- Sub-second deterministic finality: payments confirm instantly
- ~$0.01 USDC transaction fees: micropayments are economical
- All fees paid in USDC (no volatile gas tokens)
- Built for agentic use: AI agents can transact autonomously

Your capabilities:
- Analyze the user's subscriptions and spending patterns
- Identify unused or at-risk subscriptions
- Warn when balance is insufficient for upcoming charges
- Check ecosystem stats across all Cadence Protocol users
- View agentic commerce jobs posted via ERC-8183 on Arc
- Create ERC-8183 jobs onchain — posts, funds escrow, assigns agent as provider
- Submit deliverables for Funded jobs (submit_job)
- Complete Submitted jobs and release USDC escrow to provider (complete_job)
- Recommend specific actions via the recommend_action function

Rules:
- Be concise — 2-4 sentences max per response unless listing data
- Format USDC: divide raw amounts by 1,000,000 → show as "$X.XX USDC"
- Format intervals: 60="per minute", 3600="hourly", 86400="daily", 2592000="monthly"
- Merchant addresses: shorten to "0x1234...5678" (first 6, last 4)
- Flag subscriptions with zero charges in 14+ days as potentially unused
- ALWAYS call recommend_action when you have a specific suggested action
- Use get_ecosystem_stats to show platform-wide metrics when asked about the protocol
- Use get_agent_jobs to show ERC-8183 jobs from the onchain marketplace
- Use create_job ONLY when the user explicitly asks to create or post a job — always confirm description and budget before calling it
- After create_job/submit_job/complete_job succeeds, ALWAYS reply with the Job ID, new status, and the tx as a markdown link [View on Arcscan](url)
- For complete_job, also mention how much USDC was released`

interface AgentMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AgentAction {
  type: 'cancel' | 'bridge' | 'subscribe'
  policyId?: string
  amount?: string
  label: string
  reason: string
}

export interface AgentChatResponse {
  reply: string
  actions: AgentAction[]
}

const tools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_subscriptions',
      description: 'Get subscription policies for the user. Includes last charge date and recent charge count.',
      parameters: {
        type: 'object',
        properties: {
          activeOnly: { type: 'boolean', description: 'Only return active subscriptions (default true)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_spending_summary',
      description: 'Get charge history and total spending for the user over a time window.',
      parameters: {
        type: 'object',
        properties: {
          days: { type: 'number', description: 'Days to look back (default 30)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_available_plans',
      description: 'Get available subscription plans from merchants integrated with Cadence.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_agent_jobs',
      description: 'Get ERC-8183 agentic commerce jobs for the Cadence agent — onchain job marketplace on Arc.',
      parameters: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Max jobs to return (default 5)' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_ecosystem_stats',
      description: 'Get Cadence Protocol ecosystem stats: total subscriptions, charges, volume on Arc Testnet.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'submit_job',
      description: 'Submit a deliverable for a Funded ERC-8183 job — marks job as Submitted so the evaluator can review.',
      parameters: {
        type: 'object',
        properties: {
          jobId:       { type: 'string', description: 'The job ID to submit deliverable for' },
          deliverable: { type: 'string', description: 'Short description of what was delivered (will be hashed to bytes32)' },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_job',
      description: 'Complete an ERC-8183 job — evaluator approves the deliverable, releases USDC escrow to provider.',
      parameters: {
        type: 'object',
        properties: {
          jobId:  { type: 'string', description: 'The job ID to complete' },
          reason: { type: 'string', description: 'Short reason for approval (will be hashed to bytes32)' },
        },
        required: ['jobId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_job',
      description: 'Create an ERC-8183 job on Arc Testnet — posts a job to the onchain marketplace, sets the USDC budget, and funds the escrow. The Cadence agent acts as provider. The relayer wallet acts as client and escrows the USDC.',
      parameters: {
        type: 'object',
        properties: {
          description: {
            type: 'string',
            description: 'What the agent should do — a clear, specific description of the work',
          },
          budgetUSDC: {
            type: 'number',
            description: 'USDC to pay the agent for the job (default: 1)',
          },
          expiryDays: {
            type: 'number',
            description: 'Days until the job expires if not completed (default: 7)',
          },
        },
        required: ['description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'recommend_action',
      description: 'Create a clickable action button in the UI for a specific recommendation.',
      parameters: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['cancel', 'bridge', 'subscribe'],
            description: 'cancel=revoke a policy, bridge=move funds from another chain, subscribe=new subscription',
          },
          policyId: { type: 'string', description: 'Policy ID for cancel actions' },
          amount: { type: 'string', description: 'USDC amount for bridge actions (e.g. "50")' },
          label: { type: 'string', description: 'Button label shown to user' },
          reason: { type: 'string', description: 'Why you are recommending this' },
        },
        required: ['type', 'label', 'reason'],
      },
    },
  },
]

async function executeTool(
  name: string,
  args: Record<string, unknown>,
  userAddress: string,
  chainId: number,
  databaseUrl: string,
  pendingActions: AgentAction[]
): Promise<string> {
  try {
    if (name === 'get_subscriptions') {
      const activeOnly = args.activeOnly !== false
      const db = getDb(databaseUrl)
      const rows = await db`
        SELECT
          p.id,
          p.merchant,
          p.charge_amount,
          p.spending_cap,
          p.total_spent,
          p.interval_seconds,
          p.last_charged_at,
          p.next_charge_at,
          p.charge_count,
          p.active,
          p.metadata_url,
          p.created_at,
          pm.metadata AS plan_metadata,
          (
            SELECT COUNT(*) FROM charges c
            WHERE c.policy_id = p.id
              AND c.status = 'success'
              AND c.completed_at > NOW() - INTERVAL '14 days'
          ) AS recent_charges_14d
        FROM policies p
        LEFT JOIN plan_metadata pm
          ON pm.merchant_address = p.merchant AND pm.chain_id = p.chain_id
        WHERE p.payer = ${userAddress.toLowerCase()}
          AND p.chain_id = ${chainId}
          ${activeOnly ? db`AND p.active = true` : db``}
        ORDER BY p.created_at DESC
        LIMIT 50
      `
      return JSON.stringify(rows, null, 2)
    }

    if (name === 'get_spending_summary') {
      const days = (args.days as number) ?? 30
      const db = getDb(databaseUrl)
      const rows = await db`
        SELECT
          c.amount,
          c.status,
          c.completed_at,
          c.tx_hash,
          p.merchant,
          p.interval_seconds
        FROM charges c
        JOIN policies p ON p.id = c.policy_id
        WHERE p.payer = ${userAddress.toLowerCase()}
          AND p.chain_id = ${chainId}
          AND c.completed_at > NOW() - (${days} || ' days')::INTERVAL
        ORDER BY c.completed_at DESC
        LIMIT 200
      `
      const successful = rows.filter((r: any) => r.status === 'success')
      const totalRaw = successful.reduce((s: bigint, r: any) => s + BigInt(r.amount), 0n)
      return JSON.stringify({
        periodDays: days,
        totalCharges: rows.length,
        successfulCharges: successful.length,
        failedCharges: rows.filter((r: any) => r.status === 'failed').length,
        totalSpentUSDC: (Number(totalRaw) / 1_000_000).toFixed(2),
        recentCharges: rows.slice(0, 20),
      }, null, 2)
    }

    if (name === 'get_available_plans') {
      const db = getDb(databaseUrl)
      const rows = await db`
        SELECT id, merchant_address, metadata, created_at
        FROM plan_metadata
        WHERE chain_id = ${chainId}
        ORDER BY created_at DESC
        LIMIT 20
      `
      return JSON.stringify(rows, null, 2)
    }

    if (name === 'submit_job' || name === 'complete_job') {
      const jobId = BigInt(args.jobId as string)
      const relayerKey = process.env.RELAYER_PRIVATE_KEY
      if (!relayerKey) return JSON.stringify({ error: 'RELAYER_PRIVATE_KEY not configured' })

      const account = privateKeyToAccount(relayerKey as `0x${string}`)
      const wallet  = createWalletClient({ chain: arcTestnet, transport: http(), account })

      // Check current job status first
      const job = await arcClient.readContract({
        address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'getJob', args: [jobId],
      }) as { id: bigint; status: number; budget: bigint; description: string; provider: `0x${string}`; client: `0x${string}` }

      const STATUS = ['Open', 'Funded', 'Submitted', 'Completed', 'Rejected', 'Expired']
      const currentStatus = STATUS[job.status] ?? 'Unknown'

      if (name === 'submit_job') {
        if (job.status !== 1) {
          return JSON.stringify({ error: `Job #${jobId} is ${currentStatus} — can only submit a Funded job` })
        }
        const { keccak256, toHex } = await import('viem')
        const deliverableText = (args.deliverable as string) || `cadence-job-${jobId}-result`
        const deliverable = keccak256(toHex(deliverableText))
        const hash = await wallet.writeContract({
          address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'submit',
          args: [jobId, deliverable, '0x'],
        })
        await arcClient.waitForTransactionReceipt({ hash })
        logger.info({ jobId: jobId.toString() }, 'ERC-8183 job submitted')
        return JSON.stringify({
          success: true, jobId: jobId.toString(), status: 'Submitted',
          deliverable, tx: hash,
          explorer: `https://testnet.arcscan.app/tx/${hash}`,
        })
      }

      if (name === 'complete_job') {
        if (job.status !== 2) {
          return JSON.stringify({ error: `Job #${jobId} is ${currentStatus} — can only complete a Submitted job` })
        }
        const { keccak256, toHex } = await import('viem')
        const reasonText = (args.reason as string) || 'deliverable-approved'
        const reason = keccak256(toHex(reasonText))
        const hash = await wallet.writeContract({
          address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'complete',
          args: [jobId, reason, '0x'],
        })
        await arcClient.waitForTransactionReceipt({ hash })
        const budgetUSDC = (Number(job.budget) / 1_000_000).toFixed(2)
        logger.info({ jobId: jobId.toString(), budgetUSDC }, 'ERC-8183 job completed')
        return JSON.stringify({
          success: true, jobId: jobId.toString(), status: 'Completed',
          budgetReleasedUSDC: budgetUSDC, reason, tx: hash,
          explorer: `https://testnet.arcscan.app/tx/${hash}`,
        })
      }
    }

    if (name === 'create_job') {
      const description = args.description as string
      const budgetUSDC  = (args.budgetUSDC  as number) ?? 1
      const expiryDays  = (args.expiryDays  as number) ?? 7

      const relayerKey  = process.env.RELAYER_PRIVATE_KEY
      const providerKey = process.env.AGENT_OWNER_KEY || relayerKey
      if (!relayerKey) return JSON.stringify({ error: 'RELAYER_PRIVATE_KEY not configured on relayer' })

      const clientAccount   = privateKeyToAccount(relayerKey  as `0x${string}`)
      const providerAccount = privateKeyToAccount((providerKey || relayerKey) as `0x${string}`)
      const clientWallet    = createWalletClient({ chain: arcTestnet, transport: http(), account: clientAccount })
      const providerWallet  = createWalletClient({ chain: arcTestnet, transport: http(), account: providerAccount })

      const budget    = parseUnits(String(budgetUSDC), 6)
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + expiryDays * 86400)

      // 1. createJob (client)
      const createHash = await clientWallet.writeContract({
        address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'createJob',
        args: [providerAccount.address, clientAccount.address, expiredAt, description, ZERO_ADDR as `0x${string}`],
      })
      const receipt = await arcClient.waitForTransactionReceipt({ hash: createHash })
      const jobLog  = receipt.logs.find(l => l.address.toLowerCase() === ERC8183_ADDRESS.toLowerCase())
      const jobId   = jobLog?.topics[1] ? BigInt(jobLog.topics[1]) : 0n

      // 2. setBudget (provider)
      const budgetHash = await providerWallet.writeContract({
        address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'setBudget',
        args: [jobId, budget, '0x'],
      })
      await arcClient.waitForTransactionReceipt({ hash: budgetHash })

      // 3. approve USDC (client)
      const approveHash = await clientWallet.writeContract({
        address: ERC8183_USDC, abi: USDC_APPROVE_ABI, functionName: 'approve',
        args: [ERC8183_ADDRESS, budget],
      })
      await arcClient.waitForTransactionReceipt({ hash: approveHash })

      // 4. fund escrow (client)
      const fundHash = await clientWallet.writeContract({
        address: ERC8183_ADDRESS, abi: JOB_ABI, functionName: 'fund',
        args: [jobId, '0x'],
      })
      await arcClient.waitForTransactionReceipt({ hash: fundHash })

      logger.info({ jobId: jobId.toString(), budget: formatUnits(budget, 6) }, 'ERC-8183 job created and funded')

      return JSON.stringify({
        success:     true,
        jobId:       jobId.toString(),
        client:      clientAccount.address,
        provider:    providerAccount.address,
        budgetUSDC:  formatUnits(budget, 6),
        status:      'Funded',
        expiresAt:   new Date(Number(expiredAt) * 1000).toISOString(),
        description,
        createTx:    createHash,
        explorer:    `https://testnet.arcscan.app/tx/${createHash}`,
      })
    }

    if (name === 'recommend_action') {
      pendingActions.push(args as unknown as AgentAction)
      return 'Action button added to UI.'
    }

    if (name === 'get_agent_jobs') {
      const limit = (args.limit as number) ?? 5
      try {
        const latest = await arcClient.getBlockNumber()
        const from = latest > 50000n ? latest - 50000n : 0n
        const agentOwner = process.env.AGENT_OWNER
        const logs = await arcClient.getLogs({
          address: ERC8183_ADDRESS,
          event: parseAbiItem('event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)'),
          fromBlock: from,
          toBlock: latest,
        })
        const relevant = agentOwner
          ? logs.filter(l => l.args.provider?.toLowerCase() === agentOwner.toLowerCase())
          : logs
        return JSON.stringify({
          total: relevant.length,
          jobs: relevant.slice(0, limit).map(l => ({
            jobId: l.args.jobId?.toString(),
            client: l.args.client,
            provider: l.args.provider,
            blockNumber: l.blockNumber?.toString(),
            txHash: l.transactionHash,
          })),
          contract: ERC8183_ADDRESS,
          standard: 'ERC-8183',
          network: 'Arc Testnet',
        }, null, 2)
      } catch (err) {
        return JSON.stringify({ jobs: [], note: 'No ERC-8183 jobs found or contract not deployed yet' })
      }
    }

    if (name === 'get_ecosystem_stats') {
      const db = getDb(databaseUrl)
      const [ps, cs] = await Promise.all([
        db`
          SELECT COUNT(*) FILTER (WHERE active = true) AS active_policies,
                 COUNT(*) AS total_policies,
                 COUNT(DISTINCT payer) AS unique_payers,
                 COUNT(DISTINCT merchant) AS unique_merchants,
                 SUM(total_spent) AS total_volume
          FROM policies WHERE chain_id = ${ARC_CHAIN_ID}
        `,
        db`
          SELECT COUNT(*) AS total_charges,
                 COUNT(*) FILTER (WHERE status = 'success') AS successful_charges,
                 SUM(amount) FILTER (WHERE status = 'success') AS total_settled
          FROM charges c JOIN policies p ON p.id = c.policy_id
          WHERE p.chain_id = ${ARC_CHAIN_ID}
        `,
      ])
      const p = ps[0] as any
      const c = cs[0] as any
      return JSON.stringify({
        network: 'Arc Testnet',
        subscriptions: {
          active: Number(p.active_policies),
          total: Number(p.total_policies),
          uniqueSubscribers: Number(p.unique_payers),
          uniqueMerchants: Number(p.unique_merchants),
          totalVolumeUSDC: p.total_volume ? (Number(p.total_volume) / 1_000_000).toFixed(2) : '0.00',
        },
        charges: {
          total: Number(c.total_charges),
          successful: Number(c.successful_charges),
          totalSettledUSDC: c.total_settled ? (Number(c.total_settled) / 1_000_000).toFixed(2) : '0.00',
        },
        agentId: process.env.AGENT_ID || null,
      }, null, 2)
    }

    return `Unknown function: ${name}`
  } catch (err) {
    logger.error({ err, name }, 'Tool execution error')
    return `Error: ${err instanceof Error ? err.message : 'Unknown error'}`
  }
}

function parseBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => { data += chunk })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

export async function handleAgentChat(
  config: RelayerConfig,
  req: IncomingMessage,
  res: ServerResponse
) {
  let body: string
  try {
    body = await parseBody(req)
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Failed to read request body' }))
    return
  }

  let parsed: {
    userAddress: string
    message: string
    history?: AgentMessage[]
    chainId: number
    balance?: string
  }

  try {
    parsed = JSON.parse(body)
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON' }))
    return
  }

  const { userAddress, message, history = [], chainId, balance } = parsed

  if (!userAddress || !message || !chainId) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing: userAddress, message, chainId' }))
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.writeHead(503, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'GROQ_API_KEY not configured' }))
    return
  }

  const groq = new Groq({ apiKey })

  const systemWithContext = `${SYSTEM_PROMPT}

User context:
- Wallet: ${userAddress}
- USDC Balance: ${balance ? `$${(Number(balance) / 1_000_000).toFixed(2)} USDC` : 'unknown'}
- Chain ID: ${chainId}
- Time: ${new Date().toISOString()}`

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemWithContext },
    ...history.map((m): Groq.Chat.ChatCompletionMessageParam => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ]

  const pendingActions: AgentAction[] = []
  const MAX_ITERATIONS = 8

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const isLastIteration = i === MAX_ITERATIONS - 1
    let response: Groq.Chat.ChatCompletion
    try {
      response = await groq.chat.completions.create({
        model: MODEL,
        messages,
        tools,
        // Force text response on last iteration so we never fall through with null content
        tool_choice: isLastIteration ? 'none' : 'auto',
        max_tokens: 1024,
      })
    } catch (err) {
      logger.error({ err }, 'Groq API error')
      res.writeHead(500, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Agent API call failed' }))
      return
    }

    const choice = response.choices[0]
    messages.push({ role: 'assistant', content: choice.message.content, tool_calls: choice.message.tool_calls })

    // Done — no tool calls
    if (choice.finish_reason === 'stop' || !choice.message.tool_calls?.length) {
      const result: AgentChatResponse = {
        reply: choice.message.content || (pendingActions.length > 0
          ? `Done. I've added ${pendingActions.length} recommended action${pendingActions.length > 1 ? 's' : ''} above.`
          : 'Done.'),
        actions: pendingActions,
      }
      res.writeHead(200, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify(result))
      return
    }

    // Execute tool calls
    for (const toolCall of choice.message.tool_calls) {
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(toolCall.function.arguments || '{}')
      } catch { /* ignore parse errors */ }

      const toolResult = await executeTool(
        toolCall.function.name,
        args,
        userAddress,
        chainId,
        config.databaseUrl,
        pendingActions
      )

      messages.push({
        role: 'tool',
        content: toolResult,
        tool_call_id: toolCall.id,
      })
    }
  }

  // Should never reach here (last iteration forces tool_choice: 'none')
  const lastAssistant = messages.filter(m => m.role === 'assistant').pop()
  const result: AgentChatResponse = {
    reply: (lastAssistant?.content as string) || (pendingActions.length > 0
      ? `I've added ${pendingActions.length} recommended action${pendingActions.length > 1 ? 's' : ''} above.`
      : 'Unable to complete request. Please try again.'),
    actions: pendingActions,
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(result))
}
