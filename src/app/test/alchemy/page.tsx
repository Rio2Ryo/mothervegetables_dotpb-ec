'use client'

import React, { useState } from 'react'

interface AlchemyTestResult {
  success: boolean;
  message?: string;
  error?: string;
  details?: string;
  data?: {
    network?: string;
    latestBlock?: number;
    testAddress?: string;
    balance?: string;
    alchemyConnected?: boolean;
    orderId?: string;
    receivingAddress?: string;
  };
}

export default function AlchemyTestPage() {
  const [testResult, setTestResult] = useState<AlchemyTestResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [orderId, setOrderId] = useState('test-order-123')

  const testAlchemyConnection = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/alchemy')
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'API呼び出しエラー',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateAddress = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test/alchemy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId })
      })
      const result = await response.json()
      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        error: 'アドレス生成エラー',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Alchemy TestNet テスト
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 接続テスト */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🔗 接続テスト</h2>
            <p className="text-gray-600 mb-4">
              Alchemy Sepolia TestNetへの接続をテストします。
            </p>
            <button
              onClick={testAlchemyConnection}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'テスト中...' : '接続テスト実行'}
            </button>
          </div>

          {/* アドレス生成テスト */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">🏦 アドレス生成テスト</h2>
            <p className="text-gray-600 mb-4">
              注文ごとの受取アドレス生成をテストします。
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                注文ID
              </label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                placeholder="test-order-123"
              />
            </div>
            <button
              onClick={generateAddress}
              disabled={loading}
              className="w-full bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? '生成中...' : 'アドレス生成'}
            </button>
          </div>
        </div>

        {/* 結果表示 */}
        {testResult && (
          <div className="mt-8 bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">
              {testResult.success ? '✅ テスト結果' : '❌ エラー'}
            </h2>
            <div className="bg-gray-100 rounded p-4">
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* 注意事項 */}
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-yellow-800 mb-2">
            ⚠️ 注意事項
          </h3>
          <ul className="text-yellow-700 space-y-1">
            <li>• これはSepolia TestNetでのテストです</li>
            <li>• 生成されるアドレスはテスト用です</li>
            <li>• プライベートキーはテスト環境でのみ表示されます</li>
            <li>• 本番環境では安全な管理が必要です</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

