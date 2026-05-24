/**
 * Tests the x402 /api/insights paywall end-to-end.
 * Signs an EIP-3009 TransferWithAuthorization and calls the endpoint.
 *
 * Run: npx tsx scripts/test-x402.ts
 */
import 'dotenv/config'
import { createWalletClient, http, defineChain } from 'viem'
import { randomBytes } from 'crypto'
import { privateKeyToAccount } from 'viem/accounts'

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [process.env.ARC_RPC || 'https://rpc.testnet.arc.network'] } },
  testnet: true,
})

const ARC_USDC    = '0x3600000000000000000000000000000000000000' as const
const RELAYER_URL = process.env.RELAYER_URL || 'http://localhost:3001'

// Must match what the relayer expects (RELAYER_ADDRESS env var or default)
const PAY_TO = (process.env.RELAYER_ADDRESS || '0x429cB52eC6a7Fc28bC88431909Ae469977F6daCF') as `0x${string}`
const AMOUNT = 1000n  // $0.001 USDC

async function main() {
  const key = process.env.RELAYER_PRIVATE_KEY
  if (!key) { console.error('RELAYER_PRIVATE_KEY not set'); process.exit(1) }

  const account = privateKeyToAccount(key as `0x${string}`)
  const wallet  = createWalletClient({ chain: arcTestnet, transport: http(), account })

  console.log(`\n── x402 Test ──────────────────────────────────`)
  console.log(`  Endpoint : ${RELAYER_URL}/api/insights`)
  console.log(`  Payer    : ${account.address}`)
  console.log(`  Pay-to   : ${PAY_TO}`)
  console.log(`  Amount   : ${Number(AMOUNT) / 1_000_000} USDC`)

  // Step 1: probe — expect 402
  console.log('\n── Step 1: probe (no payment header) ──')
  const probe = await fetch(`${RELAYER_URL}/api/insights`)
  console.log(`  HTTP ${probe.status} ${probe.statusText}`)
  const probeBody = await probe.json()
  console.log(`  x402Version: ${probeBody.x402Version}`)
  console.log(`  accepts[0].maxAmountRequired: ${probeBody.accepts?.[0]?.maxAmountRequired}`)

  // Step 2: sign EIP-3009 TransferWithAuthorization
  console.log('\n── Step 2: sign EIP-3009 authorization ──')
  const now         = BigInt(Math.floor(Date.now() / 1000))
  const validAfter  = now - 10n
  const validBefore = now + 60n
  const nonce       = `0x${Buffer.from(randomBytes(32)).toString('hex')}` as `0x${string}`

  const signature = await wallet.signTypedData({
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: arcTestnet.id,
      verifyingContract: ARC_USDC,
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from',        type: 'address' },
        { name: 'to',          type: 'address' },
        { name: 'value',       type: 'uint256' },
        { name: 'validAfter',  type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce',       type: 'bytes32' },
      ],
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from:        account.address,
      to:          PAY_TO,
      value:       AMOUNT,
      validAfter,
      validBefore,
      nonce,
    },
  })

  const payment = {
    x402Version: 1,
    scheme: 'exact',
    network: 'arc-testnet',
    payload: {
      signature,
      authorization: {
        from:        account.address,
        to:          PAY_TO,
        value:       AMOUNT.toString(),
        validAfter:  validAfter.toString(),
        validBefore: validBefore.toString(),
        nonce,
      },
    },
  }

  const xPaymentHeader = Buffer.from(JSON.stringify(payment)).toString('base64')
  console.log(`  Signed. Header length: ${xPaymentHeader.length} chars`)

  // Step 3: call with payment header
  console.log('\n── Step 3: call with X-Payment header ──')
  const paid = await fetch(`${RELAYER_URL}/api/insights`, {
    headers: { 'X-Payment': xPaymentHeader },
  })
  console.log(`  HTTP ${paid.status} ${paid.statusText}`)

  if (paid.status === 200) {
    const insights = await paid.json()
    console.log('\n  ✅ Insights received:')
    console.log(JSON.stringify(insights, null, 2))
  } else {
    const body = await paid.json()
    console.log('  ❌ Payment rejected:', body.error || body)
  }
}

main().catch(err => {
  console.error('\n❌', err.message)
  process.exit(1)
})
