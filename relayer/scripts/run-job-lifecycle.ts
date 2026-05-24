/**
 * Runs the full ERC-8183 job lifecycle on Arc Testnet:
 *   Open → setBudget → fund → submit → complete
 *
 * The script creates a fresh job where the relayer wallet is both client
 * and evaluator, so a single key drives the whole flow.
 *
 * Required env vars:
 *   RELAYER_PRIVATE_KEY   — client + evaluator wallet
 *   AGENT_OWNER_KEY       — provider wallet (if different from relayer)
 *                           defaults to RELAYER_PRIVATE_KEY if not set
 * Optional:
 *   JOB_BUDGET_USDC       — budget in USDC (default: 1)
 *
 * Run: npx tsx scripts/run-job-lifecycle.ts
 */
import 'dotenv/config'
import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  keccak256,
  toHex,
  parseUnits,
  formatUnits,
} from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [process.env.ARC_RPC || 'https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
})

const CONTRACT  = '0x0747EEf0706327138c69792bF28Cd525089e4583' as const
const USDC_ADDR = '0x3600000000000000000000000000000000000000' as const
const ZERO      = '0x0000000000000000000000000000000000000000' as const
const BUDGET    = parseUnits(process.env.JOB_BUDGET_USDC || '1', 6)

const ABI = [
  { type: 'function', name: 'createJob', stateMutability: 'nonpayable',
    inputs: [{ name: 'provider', type: 'address' }, { name: 'evaluator', type: 'address' }, { name: 'expiredAt', type: 'uint256' }, { name: 'description', type: 'string' }, { name: 'hook', type: 'address' }],
    outputs: [{ name: 'jobId', type: 'uint256' }] },
  { type: 'function', name: 'setBudget', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'amount', type: 'uint256' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'fund', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'submit', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'deliverable', type: 'bytes32' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'complete', stateMutability: 'nonpayable',
    inputs: [{ name: 'jobId', type: 'uint256' }, { name: 'reason', type: 'bytes32' }, { name: 'optParams', type: 'bytes' }], outputs: [] },
  { type: 'function', name: 'approve', stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
  { type: 'function', name: 'getJob', stateMutability: 'view',
    inputs: [{ name: 'jobId', type: 'uint256' }],
    outputs: [{ type: 'tuple', components: [
      { name: 'id', type: 'uint256' }, { name: 'client', type: 'address' }, { name: 'provider', type: 'address' },
      { name: 'evaluator', type: 'address' }, { name: 'description', type: 'string' }, { name: 'budget', type: 'uint256' },
      { name: 'expiredAt', type: 'uint256' }, { name: 'status', type: 'uint8' }, { name: 'hook', type: 'address' },
    ]}] },
  { type: 'event', name: 'JobCreated', inputs: [
    { indexed: true, name: 'jobId', type: 'uint256' }, { indexed: true, name: 'client', type: 'address' },
    { indexed: true, name: 'provider', type: 'address' }, { indexed: false, name: 'evaluator', type: 'address' },
    { indexed: false, name: 'expiredAt', type: 'uint256' }, { indexed: false, name: 'hook', type: 'address' },
  ]},
] as const

const STATUS = ['Open', 'Funded', 'Submitted', 'Completed', 'Rejected', 'Expired']

function sep(label: string) {
  console.log(`\n──── ${label} ${'─'.repeat(Math.max(0, 44 - label.length))}`)
}

async function main() {
  const relayerKey = process.env.RELAYER_PRIVATE_KEY
  const providerKey = process.env.AGENT_OWNER_KEY || relayerKey

  if (!relayerKey) { console.error('RELAYER_PRIVATE_KEY not set'); process.exit(1) }

  const client   = privateKeyToAccount(relayerKey  as `0x${string}`)
  const provider = privateKeyToAccount(providerKey as `0x${string}`)

  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })

  const clientWallet   = createWalletClient({ chain: arcTestnet, transport: http(), account: client })
  const providerWallet = createWalletClient({ chain: arcTestnet, transport: http(), account: provider })

  sep('Wallets')
  console.log(`  Client/Evaluator : ${client.address}`)
  console.log(`  Provider         : ${provider.address}`)
  console.log(`  Budget           : ${formatUnits(BUDGET, 6)} USDC`)

  // 1. Create job
  sep('Step 1 — createJob')
  const expiredAt = BigInt(Math.floor(Date.now() / 1000) + 7 * 86400)
  const createHash = await clientWallet.writeContract({
    address: CONTRACT, abi: ABI, functionName: 'createJob',
    args: [provider.address, client.address, expiredAt, 'Cadence ERC-8183 demo job — analyze subscription spending and suggest optimizations', ZERO],
  })
  console.log(`  tx: ${createHash}`)
  const receipt = await publicClient.waitForTransactionReceipt({ hash: createHash })

  const jobCreatedLog = receipt.logs.find(l => l.address.toLowerCase() === CONTRACT.toLowerCase())
  const jobId = jobCreatedLog?.topics[1] ? BigInt(jobCreatedLog.topics[1]) : 0n
  console.log(`  Job ID: ${jobId}`)
  console.log(`  https://testnet.arcscan.app/tx/${createHash}`)

  // 2. Provider sets budget
  sep('Step 2 — setBudget')
  const budgetHash = await providerWallet.writeContract({
    address: CONTRACT, abi: ABI, functionName: 'setBudget',
    args: [jobId, BUDGET, '0x'],
  })
  await publicClient.waitForTransactionReceipt({ hash: budgetHash })
  console.log(`  Set budget to ${formatUnits(BUDGET, 6)} USDC`)
  console.log(`  https://testnet.arcscan.app/tx/${budgetHash}`)

  // 3. Client approves USDC
  sep('Step 3 — approve USDC')
  const approveHash = await clientWallet.writeContract({
    address: USDC_ADDR, abi: ABI, functionName: 'approve',
    args: [CONTRACT, BUDGET],
  })
  await publicClient.waitForTransactionReceipt({ hash: approveHash })
  console.log(`  Approved ${formatUnits(BUDGET, 6)} USDC`)

  // 4. Client funds escrow
  sep('Step 4 — fund')
  const fundHash = await clientWallet.writeContract({
    address: CONTRACT, abi: ABI, functionName: 'fund',
    args: [jobId, '0x'],
  })
  await publicClient.waitForTransactionReceipt({ hash: fundHash })
  console.log(`  Escrow funded → status: Funded`)
  console.log(`  https://testnet.arcscan.app/tx/${fundHash}`)

  // 5. Provider submits deliverable
  sep('Step 5 — submit')
  const deliverable = keccak256(toHex(`cadence-job-${jobId}-result`))
  const submitHash = await providerWallet.writeContract({
    address: CONTRACT, abi: ABI, functionName: 'submit',
    args: [jobId, deliverable, '0x'],
  })
  await publicClient.waitForTransactionReceipt({ hash: submitHash })
  console.log(`  Deliverable: ${deliverable}`)
  console.log(`  status: Submitted`)
  console.log(`  https://testnet.arcscan.app/tx/${submitHash}`)

  // 6. Evaluator completes
  sep('Step 6 — complete')
  const reason = keccak256(toHex('deliverable-approved'))
  const completeHash = await clientWallet.writeContract({
    address: CONTRACT, abi: ABI, functionName: 'complete',
    args: [jobId, reason, '0x'],
  })
  await publicClient.waitForTransactionReceipt({ hash: completeHash })
  console.log(`  status: Completed`)
  console.log(`  https://testnet.arcscan.app/tx/${completeHash}`)

  // 7. Final state
  sep('Final job state')
  const job = await publicClient.readContract({
    address: CONTRACT, abi: ABI, functionName: 'getJob', args: [jobId],
  }) as { id: bigint; status: number; budget: bigint; description: string }
  console.log(`  Job #${job.id}`)
  console.log(`  Status : ${STATUS[job.status]}`)
  console.log(`  Budget : ${formatUnits(job.budget, 6)} USDC`)
  console.log(`  Desc   : ${job.description}`)
  console.log(`\n  View: https://testnet.arcscan.app`)
}

main().catch(err => {
  console.error('\n❌', err.shortMessage || err.message)
  process.exit(1)
})
