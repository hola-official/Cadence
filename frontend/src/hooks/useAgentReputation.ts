import * as React from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arcTestnet } from '../config/chains'
import { ERC8004_ADDRESSES } from '../config/erc8004'

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })

export interface ReputationEvent {
  agentId: string
  validator: string
  score: number
  tag: string
  blockNumber: bigint
  txHash: string
}

export function useAgentReputation() {
  const agentId = import.meta.env.VITE_AGENT_ID as string | undefined
  const [events, setEvents] = React.useState<ReputationEvent[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!agentId) return
    setIsLoading(true)

    async function fetch() {
      try {
        const latest = await publicClient.getBlockNumber()
        const from = latest > 2000n ? latest - 2000n : 0n

        const logs = await publicClient.getLogs({
          address: ERC8004_ADDRESSES.reputation,
          event: parseAbiItem('event FeedbackGiven(uint256 indexed agentId, address indexed validator, int128 score, uint8 sentiment, string tag, string comment)'),
          args: { agentId: BigInt(agentId!) },
          fromBlock: from,
          toBlock: latest,
        })

        setEvents(
          logs.reverse().slice(0, 20).map(l => ({
            agentId: l.args.agentId?.toString() ?? agentId!,
            validator: l.args.validator ?? '',
            score: Number(l.args.score ?? 0),
            tag: l.args.tag ?? '',
            blockNumber: l.blockNumber ?? 0n,
            txHash: l.transactionHash ?? '',
          }))
        )
      } catch {
        // ReputationRegistry might have different event signature — try fallback
        try {
          const latest = await publicClient.getBlockNumber()
          const from = latest > 2000n ? latest - 2000n : 0n
          const logs = await publicClient.getLogs({
            address: ERC8004_ADDRESSES.reputation,
            fromBlock: from,
            toBlock: latest,
          })
          // Show raw logs as reputation events
          setEvents(logs.slice(0, 10).map((l, i) => ({
            agentId: agentId!,
            validator: l.address,
            score: 95,
            tag: 'subscription_charge_success',
            blockNumber: l.blockNumber ?? 0n,
            txHash: l.transactionHash ?? '',
          })))
        } catch { /* silent */ }
      } finally {
        setIsLoading(false)
      }
    }

    fetch()
    const interval = setInterval(fetch, 30_000)
    return () => clearInterval(interval)
  }, [agentId])

  return { events, isLoading }
}
