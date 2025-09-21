'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { injected } from 'wagmi/connectors'

interface MetaMaskAuthContextType {
  address: string | undefined
  isConnected: boolean
  isConnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signMessage: (message: string) => Promise<string | undefined>
  error: Error | null
}

const MetaMaskAuthContext = createContext<MetaMaskAuthContextType | undefined>(undefined)

export function MetaMaskAuthProvider({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const { connectAsync } = useConnect()
  const { disconnectAsync } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [isConnecting, setIsConnecting] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true)
      setError(null)

      const result = await connectAsync({
        connector: injected(),
      })

      console.log('Connected to MetaMask:', result.accounts[0])
    } catch (err) {
      console.error('Failed to connect:', err)
      setError(err as Error)
    } finally {
      setIsConnecting(false)
    }
  }, [connectAsync])

  const disconnect = useCallback(async () => {
    try {
      await disconnectAsync()
      console.log('Disconnected from MetaMask')
    } catch (err) {
      console.error('Failed to disconnect:', err)
      setError(err as Error)
    }
  }, [disconnectAsync])

  const signMessage = useCallback(async (message: string) => {
    try {
      const signature = await signMessageAsync({ message })
      return signature
    } catch (err) {
      console.error('Failed to sign message:', err)
      setError(err as Error)
      return undefined
    }
  }, [signMessageAsync])

  useEffect(() => {
    if (isConnected && address) {
      console.log('Wallet connected:', address)
    }
  }, [isConnected, address])

  return (
    <MetaMaskAuthContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect,
        signMessage,
        error,
      }}
    >
      {children}
    </MetaMaskAuthContext.Provider>
  )
}

export function useMetaMaskAuth() {
  const context = useContext(MetaMaskAuthContext)
  if (!context) {
    throw new Error('useMetaMaskAuth must be used within MetaMaskAuthProvider')
  }
  return context
}