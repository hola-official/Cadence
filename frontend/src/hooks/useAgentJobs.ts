import * as React from 'react'
import { createPublicClient, http, parseAbiItem } from 'viem'
import { arcTestnet } from '../config/chains'
import { ERC8183_ADDRESS, AGENTIC_COMMERCE_ABI, type JobStatus, JOB_STATUS } from '../config/erc8183'

const publicClient = createPublicClient({ chain: arcTestnet, transport: http() })

export interface AgentJob {
  jobId: string
  client: `0x${string}`
  provider: `0x${string}`
  description: string
  budgetUSDC: string
  expiredAt: Date
  status: JobStatus
  blockNumber: bigint
  txHash: `0x${string}`
}

export function useAgentJobs(userAddress?: string) {
  const agentOwner = import.meta.env.VITE_AGENT_OWNER as string | undefined
  const [jobs, setJobs] = React.useState<AgentJob[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!agentOwner && !userAddress) return
    setIsLoading(true)

    async function fetch() {
      try {
        const latest = await publicClient.getBlockNumber()
        const from = latest > 100000n ? latest - 100000n : 0n

        const jobEvent = parseAbiItem('event JobCreated(uint256 indexed jobId, address indexed client, address indexed provider, address evaluator, uint256 expiredAt, address hook)')

        // Fetch by provider and by client in parallel (both indexed — small responses)
        const [byProvider, byClient] = await Promise.all([
          agentOwner
            ? publicClient.getLogs({ address: ERC8183_ADDRESS, event: jobEvent, args: { provider: agentOwner as `0x${string}` }, fromBlock: from, toBlock: latest })
            : Promise.resolve([]),
          userAddress
            ? publicClient.getLogs({ address: ERC8183_ADDRESS, event: jobEvent, args: { client: userAddress as `0x${string}` }, fromBlock: from, toBlock: latest })
            : Promise.resolve([]),
        ])

        // Merge, deduplicate by jobId
        const seen = new Set<string>()
        const relevant = [...byProvider, ...byClient].filter(l => {
          const id = l.args.jobId?.toString() ?? ''
          if (seen.has(id)) return false
          seen.add(id)
          return true
        })

        const jobDetails = await Promise.all(
          relevant.slice(0, 10).map(async (l) => {
            const jobId = l.args.jobId!
            try {
              const job = await publicClient.readContract({
                address: ERC8183_ADDRESS,
                abi: AGENTIC_COMMERCE_ABI,
                functionName: 'getJob',
                args: [jobId],
              }) as { id: bigint; client: `0x${string}`; provider: `0x${string}`; description: string; budget: bigint; expiredAt: bigint; status: number }

              return {
                jobId: jobId.toString(),
                client: job.client,
                provider: job.provider,
                description: job.description,
                budgetUSDC: (Number(job.budget) / 1_000_000).toFixed(2),
                expiredAt: new Date(Number(job.expiredAt) * 1000),
                status: JOB_STATUS[job.status] ?? 'Open',
                blockNumber: l.blockNumber ?? 0n,
                txHash: (l.transactionHash ?? '0x') as `0x${string}`,
              } as AgentJob
            } catch {
              return null
            }
          })
        )

        setJobs(jobDetails.filter((j): j is NonNullable<typeof j> => j !== null))
      } catch {
        // ERC-8183 not deployed or no jobs yet — silently handle
      } finally {
        setIsLoading(false)
      }
    }

    fetch()
    const interval = setInterval(fetch, 30_000)
    return () => clearInterval(interval)
  }, [agentOwner, userAddress])

  return { jobs, isLoading }
}
