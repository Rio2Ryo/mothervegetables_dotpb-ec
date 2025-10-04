'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { forceDisconnectMetaMask } from '@/lib/metamask-utils'

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
  const { disconnect } = useDisconnect()
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

  const handleDisconnect = useCallback(async () => {
    try {
      setError(null)
      setIsConnecting(true)
      
      // 方法1: wagmiの標準的な切断
      try {
        await disconnect()
        console.log('Disconnected from MetaMask via wagmi')
        return
      } catch (wagmiError) {
        console.warn('Wagmi disconnect failed:', wagmiError)
      }
      
      // 方法2: 強制的な状態リセット
      console.log('Attempting force disconnect...')
      await forceDisconnectMetaMask()
      return
      
    } catch (err) {
      console.error('Disconnect failed:', err)
      setError(err as Error)
      
      // 最終手段: ページリロード
      if (confirm('切断に失敗しました。ページをリロードして状態をリセットしますか？')) {
        window.location.reload()
      }
    } finally {
      setIsConnecting(false)
    }
  }, [disconnect])

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
    } else if (!isConnected) {
      console.log('Wallet disconnected')
    }
  }, [isConnected, address])

  return (
    <MetaMaskAuthContext.Provider
      value={{
        address,
        isConnected,
        isConnecting,
        connect,
        disconnect: handleDisconnect,
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