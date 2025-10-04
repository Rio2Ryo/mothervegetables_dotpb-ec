'use client'

import { useSession } from 'next-auth/react'
import { GoogleAuthButton } from './GoogleAuthButton'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

interface AuthStatusProps {
  className?: string
  showLogout?: boolean
}

export function AuthStatus({ className, showLogout = true }: AuthStatusProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
        <span className="text-xs text-gray-300">読み込み中...</span>
      </div>
    )
  }

  if (session?.user) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLogout && (
          <GoogleAuthButton 
            className="!w-auto" 
            variant="compact"
          />
        )}
      </div>
    )
  }

  return (
    <GoogleAuthButton className={className} />
  )
}
