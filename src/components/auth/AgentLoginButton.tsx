'use client'

import { signIn } from 'next-auth/react'
import { useParams, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'

interface AgentLoginButtonProps {
  onSuccess?: (customer: any) => void
  onError?: (error: string) => void
  className?: string
  children?: React.ReactNode
}

export function AgentLoginButton({ 
  onSuccess, 
  onError, 
  className,
  children 
}: AgentLoginButtonProps) {
  const params = useParams<{ agentCode: string }>()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true)
      
      // 代理店コードをCookieに設定
      if (params.agentCode) {
        document.cookie = `tenant=${params.agentCode}; path=/; SameSite=Lax; max-age=${60 * 60 * 24 * 7}`
      }

      // ログイン後に戻したい代理店ページ
      const callbackUrl = params.agentCode ? `/${params.agentCode}` : '/'
      
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
          
          // 代理店ページにリダイレクト（確実に代理店ページに戻る）
          if (params.agentCode) {
            // 少し遅延を入れてからリダイレクト（認証状態の更新を待つ）
            setTimeout(() => {
              window.location.href = `/${params.agentCode}`
            }, 100)
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

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleGoogleLogin}
      disabled={isLoading}
      className={`w-full ${className}`}
    >
      {isLoading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
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
      )}
      {children || 'Google でログイン'}
    </Button>
  )
}
