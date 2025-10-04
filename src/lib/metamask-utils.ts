/**
 * MetaMaskの状態を完全にリセットするユーティリティ関数
 */

export const resetMetaMaskState = () => {
  if (typeof window === 'undefined') return

  try {
    // localStorageからwagmiとMetaMaskの状態をクリア
    const keysToRemove = [
      'wagmi.store',
      'wagmi.connected',
      'wagmi.cache',
      'wagmi.recentConnectorId',
      'wagmi.recentConnectorId.connected',
      'wagmi.recentConnectorId.connected.connected',
    ]

    keysToRemove.forEach(key => {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
    })

    // すべてのlocalStorageとsessionStorageをクリア
    localStorage.clear()
    sessionStorage.clear()

    console.log('MetaMask state cleared from storage')
  } catch (error) {
    console.warn('Failed to clear MetaMask state:', error)
  }
}

export const forceDisconnectMetaMask = async () => {
  if (typeof window === 'undefined') return

  try {
    // MetaMaskの直接的な切断を試行
    if (window.ethereum) {
      // アカウント変更イベントをリッスン
      const handleAccountsChanged = (accounts: string[]) => {
        console.log('Accounts changed:', accounts)
        if (accounts.length === 0) {
          console.log('MetaMask disconnected')
        }
      }

      window.ethereum.on('accountsChanged', handleAccountsChanged)

      // 権限の取り消しを試行
      try {
        await window.ethereum.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }]
        })
      } catch (permissionError) {
        console.warn('Failed to revoke permissions:', permissionError)
      }

      // アカウントのリセットを試行
      try {
        await window.ethereum.request({
          method: 'eth_requestAccounts',
          params: []
        })
      } catch (accountError) {
        console.warn('Failed to reset accounts:', accountError)
      }
    }

    // 状態をリセット
    resetMetaMaskState()

    // ページをリロードして完全にリセット
    setTimeout(() => {
      window.location.reload()
    }, 1000)

  } catch (error) {
    console.error('Force disconnect failed:', error)
    // 最後の手段としてページをリロード
    window.location.reload()
  }
}
