'use client'

import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAgentRedirect() {
  const { data: session, status } = useSession()
  const params = useParams<{ agentCode: string }>()
  const router = useRouter()

  useEffect(() => {
    // 認証が完了し、代理店ページにいる場合
    if (status === 'authenticated' && session?.user && params.agentCode) {
      // セッションに代理店コードが含まれているかチェック
      const sessionTenant = (session as any).tenant
      
      if (sessionTenant && sessionTenant !== params.agentCode) {
        // 異なる代理店コードの場合は警告を表示
        console.warn(`Session tenant (${sessionTenant}) does not match current agent (${params.agentCode})`)
      }
      
      // 代理店ページに確実にリダイレクト
      if (sessionTenant === params.agentCode) {
        // 同じ代理店の場合は何もしない（既に正しいページにいる）
        return
      } else if (sessionTenant) {
        // 異なる代理店の場合はその代理店ページにリダイレクト
        router.push(`/${sessionTenant}`)
      } else {
        // 代理店コードがない場合は現在の代理店ページにリダイレクト
        router.push(`/${params.agentCode}`)
      }
    }
  }, [session, status, params.agentCode, router])
}
