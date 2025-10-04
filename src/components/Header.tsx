'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuthStore } from '@/stores/authStore'
import { useSession } from 'next-auth/react'
import CartIcon from '@/components/cart/CartIcon'
import { Button } from '@/components/ui/button'
import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AuthStatus } from '@/components/auth/AuthStatus'

export default function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { isAuthenticated, customer, openModal, logout: authLogout } = useAuthStore()
  const { data: session, status } = useSession()
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
              {/* NextAuth.jsの認証状態を優先表示 */}
              {session?.user ? (
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center">
                    <svg className="w-3 h-3 text-green-600" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <AuthStatus className="!w-auto" />
                </div>
              ) : isAuthenticated ? (
                // 従来のauthStoreの認証状態（フォールバック）
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
                <AuthStatus className="!w-auto" />
              )}
            </div>
            
          </nav>
        </div>
      </div>
    </header>
  )
}

