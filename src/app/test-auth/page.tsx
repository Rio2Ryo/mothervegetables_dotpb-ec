'use client';

import { useAuthStore } from '@/stores/authStore';
import { useAgentStore } from '@/stores/agentStore';
import { Button } from '@/components/ui/button';
import { AgentStatus } from '@/components/agent/AgentStatus';
import { AgentDiscountBadge } from '@/components/agent/AgentDiscountBadge';

export default function TestAuthPage() {
  const { 
    isAuthenticated, 
    customer, 
    loading, 
    error, 
    openModal, 
    logout
  } = useAuthStore();
  
  const { 
    currentAgentCode, 
    isDetected, 
    couponCode, 
    clearAgent 
  } = useAgentStore();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          認証・代理店機能テスト
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 認証機能テスト */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🔐 認証機能</h2>
            
            {isAuthenticated ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">ログイン済み</h3>
                  <p><strong>名前:</strong> {customer?.firstName} {customer?.lastName}</p>
                  <p><strong>メール:</strong> {customer?.email}</p>
                  <p><strong>電話:</strong> {customer?.phone || '未設定'}</p>
                </div>
                <Button onClick={logout} variant="destructive" className="w-full">
                  ログアウト
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-gray-600">ログインしていません</p>
                </div>
                <div className="space-y-2">
                  <Button 
                    onClick={() => openModal('login')} 
                    className="w-full"
                  >
                    ログイン
                  </Button>
                  <Button 
                    onClick={() => openModal('register')} 
                    variant="outline" 
                    className="w-full"
                  >
                    新規登録
                  </Button>
                </div>
              </div>
            )}

            {loading && (
              <div className="text-center py-4">
                <p className="text-blue-600">処理中...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-600">{error}</p>
              </div>
            )}
          </div>

          {/* 代理店機能テスト */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🏢 代理店機能</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p><strong>代理店コード:</strong> {currentAgentCode || 'なし'}</p>
                <p><strong>検出状態:</strong> {isDetected ? '検出済み' : '未検出'}</p>
                <p><strong>クーポンコード:</strong> {couponCode || 'なし'}</p>
              </div>

              <AgentStatus />
              <AgentDiscountBadge />

              <div className="space-y-2">
                <Button 
                  onClick={() => window.location.href = '/test-agent'} 
                  variant="outline" 
                  className="w-full"
                >
                  代理店ページをテスト
                </Button>
                <Button 
                  onClick={clearAgent} 
                  variant="destructive" 
                  className="w-full"
                >
                  代理店情報をクリア
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* テスト手順 */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            📋 テスト手順
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">認証機能</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 text-sm">
                <li>「新規登録」ボタンをクリック</li>
                <li>フォームに必要事項を入力</li>
                <li>登録完了後、自動ログイン</li>
                <li>ログアウト機能をテスト</li>
              </ol>
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 mb-2">代理店機能</h4>
              <ol className="list-decimal list-inside space-y-1 text-blue-600 text-sm">
                <li>「代理店ページをテスト」をクリック</li>
                <li>URLに代理店コードが含まれる</li>
                <li>代理店情報が自動検出される</li>
                <li>商品ページで割引バッジを確認</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
