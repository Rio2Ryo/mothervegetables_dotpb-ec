'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useMetaMaskAuth } from '@/contexts/MetaMaskAuthContext'
import { useAuthStore } from '@/stores/authStore'
import CartIcon from '@/components/cart/CartIcon'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { address, isConnected, isConnecting, connect, disconnect } = useMetaMaskAuth()
  const { isAuthenticated, customer, openModal, logout: authLogout } = useAuthStore()
  const params = useParams()
  const agentCode = params.agentCode as string
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const downloadWhitepaper = () => {
    const link = document.createElement('a')
    if (language === 'JP') {
      link.href = '/wh_ja.pdf'
      link.download = 'MOTHER_VEGETABLES_Whitepaper_JP.pdf'
    } else {
      link.href = '/wh_en.pdf'
      link.download = 'MOTHER_VEGETABLES_Whitepaper_EN.pdf'
    }
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <header className="fixed top-0 left-0 right-0 bg-black/90 backdrop-blur-md" style={{ zIndex: 1100 }}>
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="hover:opacity-80 transition-opacity">
              <Image
                src="/logo-uCgt3dQl.png"
                alt="MOTHER VEGETABLES"
                width={100}
                height={100}
              />
            </Link>
          </div>

          {/* Navigation Menu */}
          <nav className="flex items-center space-x-1 lg:space-x-2">
            <Link
              href={agentCode ? `/${agentCode}` : "/"}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'ホーム', EN: 'Home' })}
            </Link>
            <Link
              href={agentCode ? `/${agentCode}/products` : "/products"}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: '商品一覧', EN: 'All Products' })}
            </Link>
            <a
              href="https://dotpb.jp"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'プロダクト', EN: 'Products' })}
            </a>
            <button
              onClick={downloadWhitepaper}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300"
            >
              {t({ JP: 'ホワイトペーパー', EN: 'Whitepaper' })}
            </button>
            <button
              onClick={() => setLanguage(language === 'EN' ? 'JP' : 'EN')}
              className="px-3 md:px-4 py-2 text-sm text-gray-300 hover:text-green-400 transition-all duration-300 border border-gray-600 rounded-md"
            >
              {language === 'EN' ? 'EN' : 'JP'}
            </button>
            <CartIcon />
            
            {/* 認証ボタン */}
            <div className="flex items-center space-x-2">
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <div className="text-xs text-gray-300">
                    {customer?.firstName} {customer?.lastName}
                  </div>
                  <Button
                    onClick={authLogout}
                    variant="destructive"
                    size="sm"
                    className="text-xs"
                  >
                    {t({ JP: 'ログアウト', EN: 'Logout' })}
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => openModal('login')}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {t({ JP: 'ログイン', EN: 'Login' })}
                </Button>
              )}
            </div>
            
            {/* MetaMaskログインボタン（仮想通貨用） */}
            {isMounted && (
              <div className="flex items-center space-x-2">
                {isConnected && address ? (
                  <>
                    <div className="text-xs text-gray-300">
                      {`Wallet: ${address.slice(0, 6)}...${address.slice(-4)}`}
                    </div>
                    <button
                      onClick={disconnect}
                      className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-all duration-300"
                      disabled={isConnecting}
                    >
                      {t({ JP: 'ウォレット切断', EN: 'Disconnect Wallet' })}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={connect}
                    className="px-3 md:px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-300 disabled:opacity-50"
                    disabled={isConnecting}
                  >
                    {isConnecting
                      ? t({ JP: '接続中...', EN: 'Connecting...' })
                      : t({ JP: 'MetaMask接続', EN: 'Connect MetaMask' })
                    }
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}

