'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { GoogleAuthButton } from './GoogleAuthButton'
import { AgentAuthStatus, AgentAuthInfo } from './AgentAuthStatus'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AgentLoginFormProps {
  onSuccess?: (customer: any) => void
  onError?: (error: string) => void
  title?: string
  description?: string
}

export function AgentLoginForm({ 
  onSuccess, 
  onError,
  title = "代理店ログイン",
  description = "Googleアカウントでログインしてください"
}: AgentLoginFormProps) {
  const [error, setError] = useState<string | null>(null)
  const params = useParams<{ agentCode: string }>()

  const handleSuccess = (customer: any) => {
    setError(null)
    onSuccess?.(customer)
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
    onError?.(errorMessage)
  }

  return (
    <div className="max-w-md mx-auto">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {description}
          </CardDescription>
          {params.agentCode && (
            <div className="text-sm text-muted-foreground">
              代理店コード: <span className="font-mono">{params.agentCode}</span>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <AgentAuthStatus
            fallback={
              <div className="space-y-4">
                <GoogleAuthButton
                  onSuccess={handleSuccess}
                  onError={handleError}
                />
                <div className="text-center text-xs text-muted-foreground">
                  <p>ログイン後、この代理店ページにアクセスできるようになります</p>
                </div>
              </div>
            }
          >
            <div className="space-y-4">
              <AgentAuthInfo />
              <div className="text-center">
                <p className="text-sm text-green-600">
                  ✓ 認証済み - 代理店ページにアクセス可能です
                </p>
              </div>
            </div>
          </AgentAuthStatus>
        </CardContent>
      </Card>
    </div>
  )
}
