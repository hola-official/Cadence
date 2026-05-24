import type { IncomingMessage, ServerResponse } from 'http'
import { createPublicClient, http, verifyTypedData, defineChain } from 'viem'

const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [process.env.ARC_RPC || 'https://rpc.testnet.arc.network'] } },
  testnet: true,
})
import { createLogger } from '../utils/logger.js'
import { getDb } from '../db/index.js'
import type { RelayerConfig } from '../config.js'

const logger = createLogger('api:x402')

// x402 payment config
const PAYMENT_AMOUNT_USDC = 1000n          // $0.001 USDC (6 decimals)
const ARC_USDC = '0x3600000000000000000000000000000000000000' as const
const RELAYER_ADDRESS = (process.env.RELAYER_ADDRESS || '0x429cB52eC6a7Fc28bC88431909Ae469977F6daCF') as `0x${string}`
const ARC_CHAIN_ID = 5042002

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })

// Build the 402 response body (x402 spec)
function paymentRequiredBody(resource: string) {
  return {
    x402Version: 1,
    error: 'Payment Required',
    accepts: [
      {
        scheme: 'exact',
        maxAmountRequired: PAYMENT_AMOUNT_USDC.toString(),
        resource,
        description: 'Cadence Protocol — AI subscription analytics powered by Arc',
        mimeType: 'application/json',
        payTo: RELAYER_ADDRESS,
        maxTimeoutSeconds: 60,
        asset: ARC_USDC,
        extra: {
          name: 'USDC',
          decimals: 6,
          chainId: ARC_CHAIN_ID,
          network: 'arc-testnet',
        },
      },
    ],
  }
}

// Verify EIP-3009 TransferWithAuthorization signature from x-payment header
async function verifyPayment(paymentHeader: string): Promise<{ valid: boolean; from?: string; error?: string }> {
  try {
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf-8')
    const payload = JSON.parse(decoded) as {
      x402Version: number
      scheme: string
      network: string
      payload: {
        signature: `0x${string}`
        authorization: {
          from: `0x${string}`
          to: `0x${string}`
          value: string
          validAfter: string
          validBefore: string
          nonce: `0x${string}`
        }
      }
    }

    if (payload.x402Version !== 1 || payload.scheme !== 'exact') {
      return { valid: false, error: 'Unsupported payment scheme' }
    }

    const { authorization, signature } = payload.payload

    // Check expiry
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (now > BigInt(authorization.validBefore)) {
      return { valid: false, error: 'Payment authorization expired' }
    }

    // Check amount covers required
    if (BigInt(authorization.value) < PAYMENT_AMOUNT_USDC) {
      return { valid: false, error: `Insufficient payment: got ${authorization.value}, need ${PAYMENT_AMOUNT_USDC}` }
    }

    // Check recipient
    if (authorization.to.toLowerCase() !== RELAYER_ADDRESS.toLowerCase()) {
      return { valid: false, error: 'Payment not addressed to this service' }
    }

    // Verify EIP-3009 TransferWithAuthorization signature
    const valid = await verifyTypedData({
      address: authorization.from,
      domain: {
        name: 'USD Coin',
        version: '2',
        chainId: ARC_CHAIN_ID,
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
        from:        authorization.from,
        to:          authorization.to,
        value:       BigInt(authorization.value),
        validAfter:  BigInt(authorization.validAfter),
        validBefore: BigInt(authorization.validBefore),
        nonce:       authorization.nonce,
      },
      signature,
    })

    if (!valid) return { valid: false, error: 'Invalid signature' }

    logger.info({ from: authorization.from, amount: authorization.value }, 'x402 payment verified')
    return { valid: true, from: authorization.from }
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : 'Failed to parse payment' }
  }
}

// GET /api/insights — ecosystem analytics behind a $0.001 USDC x402 paywall
export async function handleInsights(
  config: RelayerConfig,
  req: IncomingMessage,
  res: ServerResponse
) {
  const resource = '/api/insights'
  const paymentHeader = req.headers['x-payment'] as string | undefined

  if (!paymentHeader) {
    res.writeHead(402, { 'Content-Type': 'application/json', 'X-402-Version': '1' })
    res.end(JSON.stringify(paymentRequiredBody(resource)))
    return
  }

  const { valid, from, error } = await verifyPayment(paymentHeader)
  if (!valid) {
    res.writeHead(402, { 'Content-Type': 'application/json', 'X-402-Version': '1' })
    res.end(JSON.stringify({ ...paymentRequiredBody(resource), error: error || 'Invalid payment' }))
    return
  }

  // Payment valid — serve the insights
  try {
    const db = getDb(config.databaseUrl)

    const [policyStats, chargeStats, merchantStats] = await Promise.all([
      db`
        SELECT
          COUNT(*) FILTER (WHERE active = true)      AS active_policies,
          COUNT(*)                                    AS total_policies,
          SUM(total_spent::numeric)                   AS total_volume_raw,
          COUNT(DISTINCT payer)                       AS unique_payers,
          COUNT(DISTINCT merchant)                    AS unique_merchants
        FROM policies
        WHERE chain_id = ${ARC_CHAIN_ID}
      `,
      db`
        SELECT
          COUNT(*)                                                       AS total_charges,
          COUNT(*) FILTER (WHERE status = 'success')                     AS successful_charges,
          SUM(amount::numeric) FILTER (WHERE status = 'success')         AS total_settled_raw,
          AVG(amount::numeric) FILTER (WHERE status = 'success')         AS avg_charge_raw
        FROM charges c
        JOIN policies p ON p.id = c.policy_id
        WHERE p.chain_id = ${ARC_CHAIN_ID}
          AND c.completed_at > NOW() - INTERVAL '30 days'
      `,
      db`
        SELECT merchant, COUNT(*) AS policy_count, SUM(total_spent::numeric) AS volume
        FROM policies
        WHERE chain_id = ${ARC_CHAIN_ID} AND active = true
        GROUP BY merchant
        ORDER BY volume DESC NULLS LAST
        LIMIT 5
      `,
    ])

    const ps = policyStats[0] as any
    const cs = chargeStats[0] as any

    const insights = {
      network:        'Arc Testnet',
      chainId:        ARC_CHAIN_ID,
      agentId:        process.env.AGENT_ID || null,
      paidBy:         from,
      priceUSDC:      (Number(PAYMENT_AMOUNT_USDC) / 1_000_000).toFixed(6),
      timestamp:      new Date().toISOString(),
      subscriptions: {
        active:          Number(ps.active_policies),
        total:           Number(ps.total_policies),
        uniqueSubscribers: Number(ps.unique_payers),
        uniqueMerchants: Number(ps.unique_merchants),
        totalVolumeUSDC: ps.total_volume_raw ? (Number(ps.total_volume_raw) / 1_000_000).toFixed(2) : '0.00',
      },
      activity30d: {
        totalCharges:      Number(cs.total_charges),
        successfulCharges: Number(cs.successful_charges),
        successRate:       cs.total_charges > 0
          ? ((Number(cs.successful_charges) / Number(cs.total_charges)) * 100).toFixed(1) + '%'
          : '0%',
        totalSettledUSDC: cs.total_settled_raw ? (Number(cs.total_settled_raw) / 1_000_000).toFixed(2) : '0.00',
        avgChargeUSDC:    cs.avg_charge_raw ? (Number(cs.avg_charge_raw) / 1_000_000).toFixed(4) : '0.0000',
      },
      topMerchants: merchantStats.map((m: any) => ({
        address: `${m.merchant.slice(0, 6)}...${m.merchant.slice(-4)}`,
        policies: Number(m.policy_count),
        volumeUSDC: m.volume ? (Number(m.volume) / 1_000_000).toFixed(2) : '0.00',
      })),
    }

    res.writeHead(200, {
      'Content-Type': 'application/json',
      'X-Payment-Response': JSON.stringify({ success: true, from, network: 'arc-testnet' }),
    })
    res.end(JSON.stringify(insights, null, 2))
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error({ err }, 'Insights query failed')
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Failed to generate insights', detail: msg }))
  }
}
