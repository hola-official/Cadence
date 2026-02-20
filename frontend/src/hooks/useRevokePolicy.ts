import * as React from 'react'
import { encodeFunctionData, type Hex } from 'viem'
import { useWallet } from '../contexts/WalletContext'
import { useChain } from '../contexts/ChainContext'
import { ArbPolicyManagerAbi } from '../config/deployments'
import { parseContractError } from '../types/policy'

// Policy struct field indices (matches ArbPolicyManager.sol struct order)
const POLICY_FIELD = { payer: 0, active: 10 } as const

interface UseRevokePolicyReturn {
  revokePolicy: (policyId: `0x${string}`) => Promise<Hex>
  hash: Hex | undefined
  userOpHash: Hex | undefined
  status: string
  error: string | null
  isLoading: boolean
  reset: () => void
}

export function useRevokePolicy(): UseRevokePolicyReturn {
  const { account } = useWallet()
  const { bundlerClient, publicClient, chainConfig } = useChain()

  const [hash, setHash] = React.useState<Hex>()
  const [userOpHash, setUserOpHash] = React.useState<Hex>()
  const [status, setStatus] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)

  const revokePolicy = React.useCallback(
    async (policyId: `0x${string}`): Promise<Hex> => {
      if (!account || !bundlerClient) {
        throw new Error('Wallet not connected')
      }

      if (!chainConfig.policyManager) {
        throw new Error('Policy manager not deployed on this chain')
      }

      setIsLoading(true)
      setStatus('Cancelling subscription...')
      setError(null)
      setHash(undefined)
      setUserOpHash(undefined)

      try {
        // Pre-check: verify policy state on-chain before sending the UserOperation.
        // This gives an immediate, descriptive error instead of a cryptic bundler failure.
        if (publicClient) {
          const policyData = await publicClient.readContract({
            address: chainConfig.policyManager,
            abi: ArbPolicyManagerAbi,
            functionName: 'policies',
            args: [policyId],
          }) as unknown[]

          const onChainPayer = (policyData[POLICY_FIELD.payer] as string).toLowerCase()
          const onChainActive = policyData[POLICY_FIELD.active] as boolean

          if (!onChainActive) {
            // Policy is already inactive on-chain (auto-cancelled or previously revoked).
            // Desired state is achieved — refresh UI and return without error.
            setStatus('Subscription already cancelled')
            return '0x' as Hex
          }
          if (onChainPayer !== account.address.toLowerCase()) {
            console.error('Payer mismatch — on-chain:', onChainPayer, 'account:', account.address.toLowerCase())
            throw new Error('NotPolicyOwner')
          }
        }

        const callData = encodeFunctionData({
          abi: ArbPolicyManagerAbi,
          functionName: 'revokePolicy',
          args: [policyId],
        })

        // Use paymaster for gas sponsorship
        // Arb's bundler requires minimum gas fees that the paymaster doesn't set correctly
        const opHash = await bundlerClient.sendUserOperation({
          account,
          calls: [{ to: chainConfig.policyManager, data: callData }],
          paymaster: true,
          ...(chainConfig.minGasFees && {
            maxPriorityFeePerGas: chainConfig.minGasFees.maxPriorityFeePerGas,
            maxFeePerGas: chainConfig.minGasFees.maxFeePerGas,
          }),
        })

        setUserOpHash(opHash)
        setStatus('Waiting for confirmation...')

        const { receipt } = await bundlerClient.waitForUserOperationReceipt({
          hash: opHash,
          timeout: 120_000,
        })

        setHash(receipt.transactionHash)
        setStatus('Subscription cancelled')

        return receipt.transactionHash
      } catch (err) {
        const message = parseContractError(err)
        setError(message)
        setStatus(`Error: ${message}`)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [account, bundlerClient, publicClient, chainConfig.policyManager]
  )

  const reset = React.useCallback(() => {
    setHash(undefined)
    setUserOpHash(undefined)
    setStatus('')
    setError(null)
  }, [])

  return {
    revokePolicy,
    hash,
    userOpHash,
    status,
    error,
    isLoading,
    reset,
  }
}
