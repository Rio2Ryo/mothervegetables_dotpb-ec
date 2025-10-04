'use client'

import { useSession } from 'next-auth/react'
import { useParams } from 'next/navigation'
import { useAgentAuth } from '@/hooks/useAgentAuth'

interface AgentAuthStatusProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AgentAuthStatus({ children, fallback }: AgentAuthStatusProps) {
  const { isAuthenticated, user, tenant, isLoading } = useAgentAuth()
  const params = useParams<{ agentCode: string }>()
  const { data: session } = useSession()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="text-sm text-muted-foreground">認証状態を確認中...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return fallback || (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground mb-2">
          ログインが必要です
        </p>
      </div>
    )
  }

  // 代理店ページで、認証されたユーザーの代理店コードが一致しない場合
  if (params.agentCode && tenant && params.agentCode !== tenant) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-red-600 mb-2">
          この代理店ページにアクセスする権限がありません
        </p>
        <p className="text-xs text-muted-foreground">
          現在の代理店: {tenant}
        </p>
      </div>
    )
  }

  return <>{children}</>
}

// 代理店認証情報を表示するコンポーネント
export function AgentAuthInfo() {
  const { isAuthenticated, user, tenant } = useAgentAuth()
  const params = useParams<{ agentCode: string }>()

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="bg-muted/50 p-3 rounded-lg text-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{user?.email}</p>
          {tenant && (
            <p className="text-muted-foreground text-xs">
              代理店: {tenant}
            </p>
          )}
        </div>
        {params.agentCode && tenant && params.agentCode === tenant && (
          <div className="text-green-600 text-xs">
            ✓ 認証済み
          </div>
        )}
      </div>
    </div>
  )
}
