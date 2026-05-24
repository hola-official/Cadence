/**
 * Creates test ERC-8183 jobs on Arc Testnet pointing to the Cadence agent as provider.
 * Run: npx tsx scripts/create-test-job.ts
 */
import 'dotenv/config'
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [process.env.ARC_RPC || 'https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
})

const ERC8183_ADDRESS = '0x0747EEf0706327138c69792bF28Cd525089e4583' as const
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const
// Agent validator — used as evaluator since ERC-8183 requires a non-zero evaluator
const AGENT_VALIDATOR = '0x2fc9c94424f5cb39f61bc8e054bead661671e6e0' as const

const ABI = parseAbi([
  'function createJob(address provider, address evaluator, uint256 expiredAt, string description, address hook) returns (uint256 jobId)',
  'event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)',
])

const TEST_JOBS = [
  {
    description: 'Analyze my subscription spending patterns and recommend optimizations',
    daysUntilExpiry: 7,
  },
  {
    description: 'Cancel all unused subscriptions older than 14 days with zero charges',
    daysUntilExpiry: 3,
  },
  {
    description: 'Bridge 50 USDC from Ethereum Sepolia to Arc Testnet and set up a new merchant subscription',
    daysUntilExpiry: 14,
  },
]

async function main() {
  const privateKey = process.env.RELAYER_PRIVATE_KEY
  const agentOwner = process.env.AGENT_OWNER

  if (!privateKey) {
    console.error('❌ RELAYER_PRIVATE_KEY not set in .env')
    process.exit(1)
  }
  if (!agentOwner) {
    console.error('❌ AGENT_OWNER not set in .env')
    process.exit(1)
  }

  const account = privateKeyToAccount(privateKey as `0x${string}`)
  const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })
  const walletClient = createWalletClient({ chain: arcTestnet, transport: http(), account })

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('  Cadence ERC-8183 Job Creator')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Client (you):  ${account.address}`)
  console.log(`  Provider (agent): ${agentOwner}`)
  console.log(`  Contract:      ${ERC8183_ADDRESS}`)
  console.log(`  Network:       Arc Testnet (5042002)`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  const createdJobs: { jobId: bigint; txHash: string; description: string }[] = []

  for (const job of TEST_JOBS) {
    const expiredAt = BigInt(Math.floor(Date.now() / 1000) + job.daysUntilExpiry * 86400)

    console.log(`📋 Creating job: "${job.description.slice(0, 60)}..."`)

    try {
      const txHash = await walletClient.writeContract({
        address: ERC8183_ADDRESS,
        abi: ABI,
        functionName: 'createJob',
        args: [
          agentOwner as `0x${string}`,
          AGENT_VALIDATOR,
          expiredAt,
          job.description,
          ZERO_ADDRESS,
        ],
      })

      console.log(`   Tx: ${txHash}`)
      console.log('   Waiting for confirmation...')

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })

      // Parse jobId from JobCreated event
      const jobCreatedLog = receipt.logs.find(
        log => log.address.toLowerCase() === ERC8183_ADDRESS.toLowerCase()
      )
      const jobId = jobCreatedLog?.topics[1]
        ? BigInt(jobCreatedLog.topics[1])
        : BigInt(receipt.logs.length)

      console.log(`   ✅ Job #${jobId} created`)
      console.log(`   🔗 https://testnet.arcscan.app/tx/${txHash}\n`)

      createdJobs.push({ jobId, txHash, description: job.description })
    } catch (err: any) {
      console.error(`   ❌ Failed: ${err.shortMessage || err.message}\n`)
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`  Created ${createdJobs.length}/${TEST_JOBS.length} jobs`)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('\n  View in the UI:')
  console.log('  → AI Agent page → Jobs tab (polls every 30s)')
  console.log('\n  Test agent chat:')
  console.log('  → "show my agent jobs" or "what jobs are available?"')
  console.log()
}

main().catch(err => {
  console.error('Fatal:', err.message)
  process.exit(1)
})
