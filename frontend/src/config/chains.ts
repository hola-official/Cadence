import { defineChain, type Chain } from 'viem'
import { polygonAmoy, arbitrumSepolia } from 'viem/chains'
import { ContractAddress } from '@circle-fin/modular-wallets-core'
import { DEPLOYMENTS } from './deployments'

// Arc Testnet chain definition (not in viem)
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: ['https://rpc.testnet.arc.network'] } },
  blockExplorers: { default: { name: 'Arcscan', url: 'https://testnet.arcscan.app' } },
  testnet: true,
})

export interface ChainConfig {
  key: string
  chain: Chain
  name: string
  shortName: string
  transportPath: string  // Circle SDK path
  usdc: `0x${string}`
  policyManager?: `0x${string}`
  deployBlock?: number  // Block number to start searching for events
  explorer: string
  enabled: boolean
  // Arc's bundler has minimum gas requirements that paymaster doesn't respect
  // Set these to override the paymaster's gas estimation
  minGasFees?: {
    maxPriorityFeePerGas: bigint
    maxFeePerGas: bigint
  }
}

export const CHAIN_CONFIGS: Record<string, ChainConfig> = {
  arcTestnet: {
    key: 'arcTestnet',
    chain: arcTestnet,
    name: 'Arc Testnet',
    shortName: 'Arc',
    transportPath: 'arcTestnet',
    usdc: '0x3600000000000000000000000000000000000000',
    policyManager: undefined,
    explorer: 'https://testnet.arcscan.app',
    enabled: false,
  },
  polygonAmoy: {
    key: 'polygonAmoy',
    chain: polygonAmoy,
    name: 'Polygon Amoy',
    shortName: 'Polygon',
    transportPath: 'polygonAmoy',
    usdc: ContractAddress.PolygonAmoy_USDC,
    policyManager: undefined,
    explorer: 'https://amoy.polygonscan.com',
    enabled: false,
  },
  arbitrumSepolia: {
    key: 'arbitrumSepolia',
    chain: arbitrumSepolia,
    name: 'Arbitrum Sepolia',
    shortName: 'Arbitrum',
    transportPath: 'arbitrumSepolia',
    usdc: '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
    policyManager: DEPLOYMENTS[421614]?.contracts.arbPolicyManager as `0x${string}` | undefined,
    deployBlock: DEPLOYMENTS[421614]?.deployBlock,
    explorer: 'https://sepolia.arbiscan.io',
    enabled: true,
    // Arb's bundler requires minimum gas fees that the paymaster doesn't set correctly
    minGasFees: {
      maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei
      maxFeePerGas: 10_000_000_000n,         // 10 gwei
    },
  },
}

export const ENABLED_CHAINS = Object.values(CHAIN_CONFIGS).filter(c => c.enabled)
export const DEFAULT_CHAIN = 'arbitrumSepolia'
export type ChainKey = keyof typeof CHAIN_CONFIGS
