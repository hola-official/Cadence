import { defineChain, type Chain } from 'viem'
import { polygonAmoy, arbitrumSepolia, avalancheFuji } from 'viem/chains'
import { ContractAddress } from '@circle-fin/modular-wallets-core'
import { DEPLOYMENTS } from './deployments'

// Arc Testnet chain definition (not in viem)
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: { decimals: 6, name: 'USDC', symbol: 'USDC' },
  rpcUrls: { default: { http: [`${import.meta.env.VITE_RELAYER_URL || 'http://localhost:3001'}/api/arc-rpc`] } },
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
    policyManager: DEPLOYMENTS[5042002]?.contracts.arbPolicyManager as `0x${string}` | undefined,
    deployBlock: DEPLOYMENTS[5042002]?.deployBlock,
    explorer: 'https://testnet.arcscan.app',
    enabled: true,
    minGasFees: {
      maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei — Arc bundler minimum
      maxFeePerGas: 25_000_000_000n,         // 25 gwei — above Arc's 20 gwei floor
    },
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
  avalancheFuji: {
    key: 'avalancheFuji',
    chain: avalancheFuji,
    name: 'Avalanche Fuji',
    shortName: 'Fuji',
    transportPath: 'avalancheFuji',
    usdc: '0x5425890298aed601595a70AB815c96711a31Bc65',
    policyManager: DEPLOYMENTS[43113]?.contracts.arbPolicyManager as `0x${string}` | undefined,
    deployBlock: DEPLOYMENTS[43113]?.deployBlock,
    explorer: 'https://testnet.snowtrace.io',
    enabled: true,
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
    enabled: false,
    // Arb's bundler requires minimum gas fees that the paymaster doesn't set correctly
    minGasFees: {
      maxPriorityFeePerGas: 1_000_000_000n, // 1 gwei
      maxFeePerGas: 10_000_000_000n,         // 10 gwei
    },
  },
}

export const ENABLED_CHAINS = Object.values(CHAIN_CONFIGS).filter(c => c.enabled)
export const DEFAULT_CHAIN = 'arcTestnet'
export type ChainKey = keyof typeof CHAIN_CONFIGS
