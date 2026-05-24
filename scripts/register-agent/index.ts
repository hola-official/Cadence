import { initiateDeveloperControlledWalletsClient } from '@circle-fin/developer-controlled-wallets'
import {
  createPublicClient,
  http,
  parseAbiItem,
  getContract,
  keccak256,
  toHex,
} from 'viem'
import { arcTestnet } from 'viem/chains'

const IDENTITY_REGISTRY   = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const
const VALIDATION_REGISTRY = '0x8004Cb1BF31DAf7788923b405b754f57acEB4272' as const

// Cadence Payment Agent metadata (ERC-8004)
const METADATA_URI = 'ipfs://bafkreibdi6623n3xpf7ymk62ckb4bo75o3qemwkpfvp5i25j66itxvsoei'

const circleClient = initiateDeveloperControlledWalletsClient({
  apiKey: process.env.CIRCLE_API_KEY!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
})

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})

async function waitForTx(txId: string, label: string): Promise<string> {
  process.stdout.write(`  Waiting for ${label}`)
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const { data } = await circleClient.getTransaction({ id: txId })
    const state = data?.transaction?.state
    if (state === 'COMPLETE') {
      const txHash = data!.transaction!.txHash!
      console.log(` ✓\n    https://testnet.arcscan.app/tx/${txHash}`)
      return txHash
    }
    if (state === 'FAILED') throw new Error(`${label} failed onchain`)
    process.stdout.write('.')
  }
  throw new Error(`${label} timed out after 80s`)
}

async function main() {
  if (!process.env.CIRCLE_API_KEY || !process.env.CIRCLE_ENTITY_SECRET) {
    console.error('Error: CIRCLE_API_KEY and CIRCLE_ENTITY_SECRET must be set in .env')
    process.exit(1)
  }

  console.log('\n══ Registering Cadence Payment Agent on Arc (ERC-8004) ══\n')

  // ── Step 1: Create wallets ─────────────────────────────────────────────────
  console.log('Step 1: Creating Arc Testnet wallets...')
  const walletSet = await circleClient.createWalletSet({ name: 'Cadence Agent Wallets' })
  const walletsResponse = await circleClient.createWallets({
    blockchains: ['ARC-TESTNET'],
    count: 2,
    walletSetId: walletSet.data?.walletSet?.id ?? '',
    accountType: 'SCA',
  })
  const ownerWallet     = walletsResponse.data?.wallets?.[0]!
  const validatorWallet = walletsResponse.data?.wallets?.[1]!
  console.log(`  Owner wallet:     ${ownerWallet.address}`)
  console.log(`  Validator wallet: ${validatorWallet.address}`)

  // ── Step 2: Register identity ──────────────────────────────────────────────
  console.log('\nStep 2: Registering agent identity...')
  const registerTx = await circleClient.createContractExecutionTransaction({
    walletAddress: ownerWallet.address!,
    blockchain: 'ARC-TESTNET',
    contractAddress: IDENTITY_REGISTRY,
    abiFunctionSignature: 'register(string)',
    abiParameters: [METADATA_URI],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })
  await waitForTx(registerTx.data?.id!, 'identity registration')

  // ── Step 3: Get agent ID from Transfer event ───────────────────────────────
  console.log('\nStep 3: Retrieving agent ID...')
  const latestBlock = await publicClient.getBlockNumber()
  const fromBlock = latestBlock > 10000n ? latestBlock - 10000n : 0n

  const transferLogs = await publicClient.getLogs({
    address: IDENTITY_REGISTRY,
    event: parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)'),
    args: { to: ownerWallet.address as `0x${string}` },
    fromBlock,
    toBlock: latestBlock,
  })
  if (transferLogs.length === 0) throw new Error('No Transfer event found — registration may have failed')

  const agentId = transferLogs[transferLogs.length - 1].args.tokenId!.toString()

  const identityContract = getContract({
    address: IDENTITY_REGISTRY,
    abi: [
      { name: 'ownerOf',   type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'address' }] },
      { name: 'tokenURI',  type: 'function', stateMutability: 'view', inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] },
    ],
    client: publicClient,
  })
  const owner    = await identityContract.read.ownerOf([BigInt(agentId)])
  const tokenURI = await identityContract.read.tokenURI([BigInt(agentId)])

  console.log(`  Agent ID:   ${agentId}`)
  console.log(`  Owner:      ${owner}`)
  console.log(`  Metadata:   ${tokenURI}`)
  console.log(`  Explorer:   https://testnet.arcscan.app/token/${IDENTITY_REGISTRY}/${agentId}`)

  // ── Step 4: Record initial reputation ─────────────────────────────────────
  console.log('\nStep 4: Recording initial reputation...')
  const tag          = 'subscription_payment_agent'
  const feedbackHash = keccak256(toHex(tag))

  const reputationTx = await circleClient.createContractExecutionTransaction({
    walletAddress: validatorWallet.address!,
    blockchain: 'ARC-TESTNET',
    contractAddress: REPUTATION_REGISTRY,
    abiFunctionSignature: 'giveFeedback(uint256,int128,uint8,string,string,string,string,bytes32)',
    abiParameters: [agentId, '95', '0', tag, 'Cadence autonomous subscription payment agent — verified payment processor on Arc', '', '', feedbackHash],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })
  await waitForTx(reputationTx.data?.id!, 'reputation recording')

  // ── Step 5: Request validation ────────────────────────────────────────────
  console.log('\nStep 5: Requesting validation...')
  const requestHash = keccak256(toHex(`cadence_agent_validation_${agentId}`))

  const validationReqTx = await circleClient.createContractExecutionTransaction({
    walletAddress: ownerWallet.address!,
    blockchain: 'ARC-TESTNET',
    contractAddress: VALIDATION_REGISTRY,
    abiFunctionSignature: 'validationRequest(address,uint256,string,bytes32)',
    abiParameters: [validatorWallet.address!, agentId, METADATA_URI, requestHash],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })
  await waitForTx(validationReqTx.data?.id!, 'validation request')

  // ── Step 6: Validator responds ────────────────────────────────────────────
  console.log('\nStep 6: Validator confirming...')
  const validationResTx = await circleClient.createContractExecutionTransaction({
    walletAddress: validatorWallet.address!,
    blockchain: 'ARC-TESTNET',
    contractAddress: VALIDATION_REGISTRY,
    abiFunctionSignature: 'validationResponse(bytes32,uint8,string,bytes32,string)',
    abiParameters: [requestHash, '100', '', '0x' + '0'.repeat(64), 'payment_agent_verified'],
    fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
  })
  await waitForTx(validationResTx.data?.id!, 'validation response')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n══ Registration Complete ══')
  console.log(`  Agent ID:         ${agentId}`)
  console.log(`  Owner wallet:     ${ownerWallet.address}`)
  console.log(`  Validator wallet: ${validatorWallet.address}`)
  console.log(`  Explorer:         https://testnet.arcscan.app/token/${IDENTITY_REGISTRY}/${agentId}`)
  console.log('\n  Add these to your .env files:\n')
  console.log(`  # frontend/.env`)
  console.log(`  VITE_AGENT_ID=${agentId}`)
  console.log(`  VITE_AGENT_OWNER=${ownerWallet.address}`)
  console.log(`  VITE_AGENT_VALIDATOR=${validatorWallet.address}`)
  console.log(`\n  # relayer/.env`)
  console.log(`  AGENT_ID=${agentId}`)
  console.log(`  AGENT_VALIDATOR_WALLET_ID=${validatorWallet.id}`)
}

main().catch(err => {
  console.error('\nError:', err.message ?? err)
  process.exit(1)
})
