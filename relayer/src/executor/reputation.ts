import { createPublicClient, createWalletClient, http, keccak256, toHex } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { createLogger } from '../utils/logger.js'
import type { RelayerConfig } from '../config.js'

const logger = createLogger('executor:reputation')

const ARC_CHAIN_ID = 5042002
const REPUTATION_REGISTRY = '0x8004B663056A597Dffe9eCcC1965A193B7388713' as const

const REPUTATION_ABI = [
  {
    name: 'giveFeedback',
    type: 'function' as const,
    stateMutability: 'nonpayable' as const,
    inputs: [
      { name: 'agentId',      type: 'uint256' },
      { name: 'score',        type: 'int128' },
      { name: 'sentiment',    type: 'uint8' },
      { name: 'tag',          type: 'string' },
      { name: 'comment',      type: 'string' },
      { name: 'evidence1',    type: 'string' },
      { name: 'evidence2',    type: 'string' },
      { name: 'feedbackHash', type: 'bytes32' },
    ],
    outputs: [],
  },
] as const

// Records a reputation event on Arc's ERC-8004 ReputationRegistry after a successful charge.
// Non-blocking: any failure is logged as a warning, never propagated to the caller.
export async function recordChargeReputation(
  config: RelayerConfig,
  chainId: number,
  policyId: string,
  chargeTxHash: string
): Promise<void> {
  const agentId = process.env.AGENT_ID
  if (!agentId) return
  if (chainId !== ARC_CHAIN_ID) return

  const arcRpc = process.env.ARC_RPC || 'https://rpc.testnet.arc.network'

  try {
    const account = privateKeyToAccount(config.privateKey)
    const publicClient = createPublicClient({ transport: http(arcRpc) })
    const walletClient = createWalletClient({ account, transport: http(arcRpc) })

    const tag = 'subscription_charge_success'
    const feedbackHash = keccak256(toHex(`${tag}_${policyId}_${chargeTxHash}`))

    const { request } = await publicClient.simulateContract({
      address: REPUTATION_REGISTRY,
      abi: REPUTATION_ABI,
      functionName: 'giveFeedback',
      args: [
        BigInt(agentId),
        95n,
        0,
        tag,
        `Successful subscription charge tx ${chargeTxHash.slice(0, 10)}`,
        chargeTxHash,
        '',
        feedbackHash,
      ],
      account,
    })

    const hash = await walletClient.writeContract(request)
    logger.info({ agentId, policyId, reputationTx: hash }, 'Reputation recorded on Arc')
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : err, agentId, policyId }, 'Reputation recording skipped')
  }
}
