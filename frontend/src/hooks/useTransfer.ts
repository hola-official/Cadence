import * as React from 'react'
import { parseUnits, type Hex } from 'viem'
import { encodeTransfer } from '@circle-fin/modular-wallets-core'
import { useWallet } from '../contexts/WalletContext'
import { useChain } from '../contexts/ChainContext'
import { USDC_DECIMALS } from '../config'

interface UseTransferReturn {
  hash: Hex | undefined
  userOpHash: Hex | undefined
  status: string
  isLoading: boolean
  sendUSDC: (to: `0x${string}`, amount: string) => Promise<void>
  reset: () => void
}

export function useTransfer(): UseTransferReturn {
  const { account, fetchBalance } = useWallet()
  const { bundlerClient, chainConfig } = useChain()
  const [hash, setHash] = React.useState<Hex>()
  const [userOpHash, setUserOpHash] = React.useState<Hex>()
  const [status, setStatus] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)

  const sendUSDC = React.useCallback(
    async (to: `0x${string}`, amount: string) => {
      if (!account || !bundlerClient) return

      setIsLoading(true)
      setStatus('Sending...')
      setHash(undefined)
      setUserOpHash(undefined)

      try {
        const callData = encodeTransfer(
          to,
          chainConfig.usdc,
          parseUnits(amount, USDC_DECIMALS)
        )

        // Use paymaster for gas sponsorship
        // Arc's bundler requires minimum gas fees that the paymaster doesn't set correctly
        const opHash = await bundlerClient.sendUserOperation({
          account,
          calls: [callData],
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
        })

        setHash(receipt.transactionHash)
        setStatus('Confirmed')

        // Refresh balance after sending
        await fetchBalance()
      } catch (err) {
        console.error('Transfer failed:', err)
        setStatus(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setIsLoading(false)
      }
    },
    [account, fetchBalance, bundlerClient, chainConfig.usdc]
  )

  const reset = React.useCallback(() => {
    setHash(undefined)
    setUserOpHash(undefined)
    setStatus('')
  }, [])

  return {
    hash,
    userOpHash,
    status,
    isLoading,
    sendUSDC,
    reset,
  }
}
