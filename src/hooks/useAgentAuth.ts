'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

interface AgentAuthState {
  isAuthenticated: boolean
  user: any
  tenant: string | null
  isLoading: boolean
}

export function useAgentAuth(): AgentAuthState {
  const { data: session, status } = useSession()
  const [agentAuth, setAgentAuth] = useState<AgentAuthState>({
    isAuthenticated: false,
    user: null,
    tenant: null,
    isLoading: true,
  })

  useEffect(() => {
    if (status === 'loading') {
      setAgentAuth(prev => ({ ...prev, isLoading: true }))
      return
    }

    if (status === 'unauthenticated') {
      setAgentAuth({
        isAuthenticated: false,
        user: null,
        tenant: null,
        isLoading: false,
      })
      return
    }

    if (session?.user) {
      setAgentAuth({
        isAuthenticated: true,
        user: session.user,
        tenant: (session as any).tenant || null,
        isLoading: false,
      })
    }
  }, [session, status])

  return agentAuth
}
