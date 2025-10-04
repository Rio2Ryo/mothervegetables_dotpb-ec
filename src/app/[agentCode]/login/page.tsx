import { AgentLoginForm } from '@/components/auth/AgentLoginForm'

interface LoginPageProps {
  params: {
    agentCode: string
  }
}

export default function AgentLoginPage({ params }: LoginPageProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <AgentLoginForm
          title={`${params.agentCode} 代理店ログイン`}
          description="Googleアカウントでログインして代理店ページにアクセスしてください"
        />
      </div>
    </div>
  )
}
