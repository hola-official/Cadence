import * as React from 'react'
import { createPublicClient, http, keccak256, toHex } from 'viem'
import { arcTestnet } from '../config/chains'
import { ERC8004_ADDRESSES, IDENTITY_REGISTRY_ABI, VALIDATION_REGISTRY_ABI } from '../config/erc8004'

const publicClient = createPublicClient({
  chain: arcTestnet,
  transport: http(),
})

export interface AgentIdentity {
  agentId: string
  owner: string | null
  tokenURI: string | null
  isValidated: boolean
  validationTag: string | null
}

export function useAgentIdentity() {
  const agentId   = import.meta.env.VITE_AGENT_ID   as string | undefined
  const agentOwner = import.meta.env.VITE_AGENT_OWNER as string | undefined
  const agentValidator = import.meta.env.VITE_AGENT_VALIDATOR as string | undefined

  const [identity, setIdentity] = React.useState<AgentIdentity | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  React.useEffect(() => {
    if (!agentId) return
    setIsLoading(true)

    async function fetchIdentity() {
      try {
        const id = BigInt(agentId!)

        const [owner, tokenURI] = await Promise.all([
          publicClient.readContract({
            address: ERC8004_ADDRESSES.identity,
            abi: IDENTITY_REGISTRY_ABI,
            functionName: 'ownerOf',
            args: [id],
          }),
          publicClient.readContract({
            address: ERC8004_ADDRESSES.identity,
            abi: IDENTITY_REGISTRY_ABI,
            functionName: 'tokenURI',
            args: [id],
          }),
        ])

        // Check validation status using the same hash the registration script produced
        let isValidated = false
        let validationTag: string | null = null
        try {
          const requestHash = keccak256(toHex(`cadence_agent_validation_${agentId}`))
          const status = await publicClient.readContract({
            address: ERC8004_ADDRESSES.validation,
            abi: VALIDATION_REGISTRY_ABI,
            functionName: 'getValidationStatus',
            args: [requestHash],
          }) as readonly [string, bigint, number, string, string, bigint]
          // response: 100 = passed
          isValidated  = status[2] === 100
          validationTag = status[4] || null
        } catch { /* not yet validated */ }

        setIdentity({
          agentId: agentId!,
          owner: owner as string,
          tokenURI: tokenURI as string,
          isValidated,
          validationTag,
        })
      } catch (err) {
        console.warn('useAgentIdentity: failed to load identity', err)
        // Still show partial info from env
        setIdentity({
          agentId: agentId!,
          owner: agentOwner ?? null,
          tokenURI: null,
          isValidated: false,
          validationTag: null,
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchIdentity()
  }, [agentId, agentOwner, agentValidator])

  return { identity, isLoading, isRegistered: !!agentId }
}
