'use client'

import React, { useState } from 'react'

interface ShopifyPermissionsResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: any;
  data?: any;
}

export default function ShopifyPermissionsTestPage() {
  const [testResult, setTestResult] = useState<ShopifyPermissionsResult | null>(null)
  const [loading, setLoading] = useState(false)

  const testCustomerCreationPermissions = async () => {
    setLoading(true)
    setTestResult(null)
    
    try {
      const response = await fetch('/api/test/shopify-permissions')
      const data = await response.json()
      setTestResult(data)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'ネットワークエラー',
        details: (error as Error).message
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">
            Shopify顧客作成権限テスト
          </h1>
          
          <div className="space-y-4">
            <button
              onClick={testCustomerCreationPermissions}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'テスト中...' : '顧客作成権限をテスト'}
            </button>

            {testResult && (
              <div className="mt-8 bg-gray-100 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  {testResult.success ? '✅ テスト結果' : '❌ エラー'}
                </h2>
                <div className="space-y-2">
                  {testResult.message && (
                    <p className="text-green-600">{testResult.message}</p>
                  )}
                  {testResult.error && (
                    <p className="text-red-600">{testResult.error}</p>
                  )}
                  <div className="bg-white rounded p-4">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              📋 必要な権限設定
            </h3>
            <p className="text-sm text-blue-700 mb-2">
              Shopify Adminで以下の権限を有効にしてください：
            </p>
            <ul className="text-sm text-blue-700 space-y-1 ml-4">
              <li>• <code>unauthenticated_write_customers</code> - 顧客作成</li>
              <li>• <code>unauthenticated_read_customers</code> - 顧客情報取得</li>
            </ul>
          </div>

          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              🔧 権限設定手順
            </h3>
            <ol className="text-sm text-yellow-700 space-y-1 ml-4">
              <li>1. Shopify Adminにログイン</li>
              <li>2. 「Settings」→「Apps and sales channels」</li>
              <li>3. 「Develop apps」→作成したアプリを選択</li>
              <li>4. 「Storefront API access scopes」タブを開く</li>
              <li>5. 必要な権限をチェックして保存</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  )
}



