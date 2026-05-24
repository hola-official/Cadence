import * as React from 'react'
import { createPublicClient, http, parseAbi } from 'viem'
import { arcTestnet, CHAIN_CONFIGS } from '../config/chains'
import { GATEWAY_SOURCE_CHAINS } from '../config/gateway'

const ERC20_ABI = parseAbi(['function balanceOf(address) view returns (uint256)'])

export interface ChainBalance {
  chainKey: string
  chainName: string
  shortName: string
  balanceRaw: bigint
  balanceUSDC: string
  explorer: string
  isSettlement: boolean
}

// All chains to check: Arc (settlement) + all Circle Gateway source chains
function buildChainList() {
  const chains: { chainKey: string; chain: any; usdc: string; name: string; shortName: string; explorer: string; isSettlement: boolean }[] = [
    {
      chainKey: 'arcTestnet',
      chain: arcTestnet,
      usdc: CHAIN_CONFIGS.arcTestnet.usdc,
      name: CHAIN_CONFIGS.arcTestnet.name,
      shortName: 'Arc',
      explorer: CHAIN_CONFIGS.arcTestnet.explorer,
      isSettlement: true,
    },
    ...GATEWAY_SOURCE_CHAINS.map(c => ({
      chainKey: c.shortName.toLowerCase().replace(/\s+/g, '-'),
      chain: c.testnet.ViemChain,
      usdc: c.testnet.USDCAddress,
      name: c.name,
      shortName: c.shortName,
      explorer: c.testnet.ViemChain.blockExplorers?.default?.url ?? '',
      isSettlement: false,
    })),
  ]
  return chains
}

const CHAIN_LIST = buildChainList()

export function useMultiChainBalance(userAddress?: string) {
  const [balances, setBalances] = React.useState<ChainBalance[]>([])
  const [totalUSDC, setTotalUSDC] = React.useState('0.00')
  const [settlementUSDC, setSettlementUSDC] = React.useState('0.00')
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!userAddress) return
    setIsLoading(true)

    async function fetchAll() {
      const results = await Promise.allSettled(
        CHAIN_LIST.map(async ({ chainKey, chain, usdc, name, shortName, explorer, isSettlement }) => {
          const client = createPublicClient({ chain, transport: http() })
          const raw = await client.readContract({
            address: usdc as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'balanceOf',
            args: [userAddress as `0x${string}`],
          })
          return {
            chainKey,
            chainName: name,
            shortName,
            balanceRaw: raw,
            balanceUSDC: (Number(raw) / 1_000_000).toFixed(2),
            explorer,
            isSettlement,
          } as ChainBalance
        })
      )

      const resolved: ChainBalance[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') resolved.push(r.value)
      }

      const total = resolved.reduce((sum, b) => sum + b.balanceRaw, 0n)
      const settlement = resolved.find(b => b.isSettlement)?.balanceRaw ?? 0n

      setBalances(resolved)
      setTotalUSDC((Number(total) / 1_000_000).toFixed(2))
      setSettlementUSDC((Number(settlement) / 1_000_000).toFixed(2))
      setIsLoading(false)
    }

    fetchAll()
    const interval = setInterval(fetchAll, 30_000)
    return () => clearInterval(interval)
  }, [userAddress])

  return { balances, totalUSDC, settlementUSDC, isLoading }
}
