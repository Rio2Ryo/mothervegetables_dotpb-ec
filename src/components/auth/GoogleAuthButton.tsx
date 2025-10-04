'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import { useParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2, LogOut } from 'lucide-react'
import { useState } from 'react'

interface GoogleAuthButtonProps {
  onSuccess?: (customer: any) => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
  variant?: 'default' | 'compact'
}

export function GoogleAuthButton({ 
  onSuccess, 
  onError, 
  className,
  children,
  variant = 'default'
}: GoogleAuthButtonProps) {
  const { data: session, status } = useSession()
  const [isLoading, setIsLoading] = useState(false)
  const params = useParams<{ agentCode: string }>()
  const pathname = usePathname()

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      
      // 代理店コードをCookieに設定
      if (params.agentCode) {
        document.cookie = `tenant=${params.agentCode}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`
      }

      // ログイン後に戻したいページを決定
      let callbackUrl = '/'
      if (params.agentCode) {
        // 代理店ページの場合は代理店ページに戻る
        callbackUrl = `/${params.agentCode}`
      } else if (pathname.startsWith('/')) {
        // 現在のページがルート以外の場合は現在のページに戻る
        callbackUrl = pathname
      }
      
      // NextAuth.jsのGoogle プロバイダーでサインイン
      const result = await signIn('google', {
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        onError?.('Google ログインに失敗しました')
        return
      }

      if (result?.ok) {
        // Google認証成功後、Shopifyとの連携を確認
        const response = await fetch('/api/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (response.ok && data.success) {
          onSuccess?.(data.customer)
          
          // 代理店ページの場合は代理店ページにリダイレクト
          if (params.agentCode) {
            window.location.href = `/${params.agentCode}`
          } else if (callbackUrl !== '/') {
            // その他のページの場合は元のページにリダイレクト
            window.location.href = callbackUrl
          }
        } else {
          onError?.(data.message || '認証に失敗しました')
        }
      }
    } catch (error) {
      console.error('Google login error:', error)
      onError?.('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)
      await signOut({ redirect: false })
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ローディング状態
  if (status === 'loading' || isLoading) {
    return (
      <Button
        type="button"
        variant="outline"
        disabled
        className={`w-full ${className}`}
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        処理中...
      </Button>
    )
  }

  // ログイン済み状態
  if (session?.user) {
    if (variant === 'compact') {
      return (
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className={`${className} !p-2`}
          size="sm"
          title="ログアウト"
        >
          <LogOut className="h-3 w-3" />
        </Button>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-center space-x-2 p-2 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24">
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
          <div className="text-sm">
            <p className="font-medium text-green-800">{session.user.email}</p>
            <p className="text-green-600">Google でログイン済み</p>
          </div>
        </div>
        
        <Button
          type="button"
          variant="outline"
          onClick={handleLogout}
          className={`w-full ${className}`}
        >
          <LogOut className="mr-2 h-4 w-4" />
          ログアウト
        </Button>
      </div>
    )
  }

  // 未ログイン状態
  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      className={`w-full ${className}`}
    >
      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
      {children || 'Google でログイン'}
    </Button>
  )
}
