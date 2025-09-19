# 仮想通貨決済機能 サービス統合設計書

## 🎯 選択された外部サービス

### **ウォレット管理・入金検知**
- **Alchemy**: メインのWeb3プロバイダー
  - xpub監視・アドレス生成
  - 残高・トランザクション取得
  - 入金検知・Webhook通知

### **顧客用ウォレット**
- **Privy**: 埋め込みウォレット（MPC方式）
  - メール/SSOでウォレット生成
  - 導入コスト削減
  - ユーザー体験向上

## 🛠 更新された技術スタック

```typescript
// フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query

// Web3 & ウォレット
- Alchemy SDK (@alchemy-sdk/core)
- Privy React (@privy-io/react-auth)
- ethers.js v6

// バックエンド
- Next.js API Routes
- PostgreSQL + Prisma
- Alchemy Webhooks

// インフラ
- Vercel (デプロイ)
- Alchemy (Web3プロバイダー)
- Privy (顧客ウォレット)
```

## 🔄 更新された決済フロー

### **新しいフロー**
```
1. 顧客が「独自コインで支払う」を選択
2. Privyでログイン/ウォレット作成
3. 注文データをバックエンドに送信
4. Alchemyで受取アドレス生成・監視開始
5. 顧客がPrivyウォレットから送金
6. Alchemyが入金検知・Webhook通知
7. 照合・確認後、商品発送
```

## 📁 更新されたプロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── crypto/
│   │   │   ├── generate-address/route.ts
│   │   │   ├── webhook/
│   │   │   │   └── alchemy/route.ts
│   │   │   └── orders/
│   │   │       └── [orderId]/route.ts
│   │   └── orders/
│   │       └── route.ts
│   ├── payment/
│   │   ├── crypto/
│   │   │   └── [orderId]/page.tsx
│   │   └── success/page.tsx
│   └── cart/page.tsx
├── components/
│   ├── crypto/
│   │   ├── PaymentForm.tsx
│   │   ├── PrivyWallet.tsx
│   │   ├── AddressDisplay.tsx
│   │   └── PaymentStatus.tsx
│   └── ui/
│       └── Button.tsx
├── lib/
│   ├── crypto/
│   │   ├── alchemy.ts
│   │   ├── privy.ts
│   │   └── wallet.ts
│   ├── database/
│   │   ├── schema.prisma
│   │   └── connection.ts
│   └── utils/
│       └── validation.ts
├── types/
│   ├── crypto.ts
│   ├── order.ts
│   └── privy.ts
└── hooks/
    ├── useCryptoPayment.ts
    ├── usePrivyWallet.ts
    └── useOrderStatus.ts
```

## 🔧 実装詳細

### **1. Alchemy統合**

```typescript
// lib/crypto/alchemy.ts
import { Alchemy, Network, AlchemyConfig } from 'alchemy-sdk'

const config: AlchemyConfig = {
  apiKey: process.env.ALCHEMY_API_KEY!,
  network: Network.ETH_MAINNET, // または ETH_SEPOLIA (テストネット)
}

export const alchemy = new Alchemy(config)

export class AlchemyWalletManager {
  private xpub: string

  constructor(xpub: string) {
    this.xpub = xpub
  }

  // アドレス生成（xpubから）
  generateAddress(index: number): string {
    // HDウォレットの派生パスを使用
    const derivationPath = `m/44'/60'/0'/0/${index}`
    // 実際の実装では、bip32ライブラリを使用
    return this.deriveAddress(derivationPath)
  }

  // 残高取得
  async getBalance(address: string): Promise<string> {
    const balance = await alchemy.core.getBalance(address, 'latest')
    return balance.toString()
  }

  // トランザクション履歴取得
  async getTransactions(address: string): Promise<any[]> {
    return await alchemy.core.getAssetTransfers({
      fromAddress: address,
      category: ['external', 'internal'],
    })
  }

  // Webhook設定
  async setupWebhook(webhookUrl: string, addresses: string[]): Promise<void> {
    await alchemy.notify.webhook.create({
      url: webhookUrl,
      webhookType: 'ADDRESS_ACTIVITY',
      addresses: addresses,
    })
  }
}
```

### **2. Privy統合**

```typescript
// lib/crypto/privy.ts
import { PrivyProvider, usePrivy } from '@privy-io/react-auth'

export function PrivyWrapper({ children }: { children: React.ReactNode }) {
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
        },
      }}
    >
      {children}
    </PrivyProvider>
  )
}

// カスタムフック
export function usePrivyWallet() {
  const { ready, authenticated, user, login, logout } = usePrivy()
  
  const getWallet = () => {
    return user?.wallet
  }

  const sendTransaction = async (to: string, amount: string) => {
    const wallet = getWallet()
    if (!wallet) throw new Error('Wallet not found')

    const transaction = await wallet.sendTransaction({
      to,
      value: amount,
    })

    return transaction
  }

  return {
    ready,
    authenticated,
    user,
    login,
    logout,
    getWallet,
    sendTransaction,
  }
}
```

### **3. 更新された支払い画面**

```typescript
// components/crypto/PaymentForm.tsx
'use client'

import { useState, useEffect } from 'react'
import { usePrivyWallet } from '@/hooks/usePrivyWallet'
import { useLanguage } from '@/contexts/LanguageContext'

interface PaymentFormProps {
  orderId: string
  address: string
  amount: string
  currency: string
  expiresAt: string
}

export function PaymentForm({ orderId, address, amount, currency, expiresAt }: PaymentFormProps) {
  const { t } = useLanguage()
  const { authenticated, login, getWallet, sendTransaction } = usePrivyWallet()
  const [status, setStatus] = useState<'login' | 'ready' | 'sending' | 'sent' | 'confirmed'>('login')
  const [timeLeft, setTimeLeft] = useState<number>(0)

  useEffect(() => {
    if (authenticated) {
      setStatus('ready')
    } else {
      setStatus('login')
    }
  }, [authenticated])

  const handlePayment = async () => {
    try {
      setStatus('sending')
      
      const tx = await sendTransaction(address, amount)
      
      setStatus('sent')
      
      // トランザクション確認を待機
      await tx.wait()
      setStatus('confirmed')
      
    } catch (error) {
      console.error('Payment failed:', error)
      setStatus('ready')
    }
  }

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">
        {t({ JP: '仮想通貨決済', EN: 'Crypto Payment' })}
      </h2>
      
      <div className="space-y-6">
        {/* ログイン状態 */}
        {status === 'login' && (
          <div className="text-center">
            <p className="mb-4">{t({ JP: '決済を続行するにはログインが必要です', EN: 'Login required to continue payment' })}</p>
            <button
              onClick={login}
              className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
            >
              {t({ JP: 'ログイン', EN: 'Login' })}
            </button>
          </div>
        )}

        {/* 決済準備完了 */}
        {status === 'ready' && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-semibold mb-2">
                {amount} {currency}
              </p>
              <p className="text-sm text-gray-600">
                {t({ JP: '支払い先アドレス', EN: 'Payment Address' })}
              </p>
              <p className="font-mono text-xs break-all bg-gray-100 p-2 rounded">
                {address}
              </p>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">
                {t({ JP: '残り時間', EN: 'Time Left' })}
              </p>
              <p className="text-xl font-mono font-bold text-red-600">
                {formatTime(timeLeft)}
              </p>
            </div>

            <button
              onClick={handlePayment}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-6 rounded"
            >
              {t({ JP: '送金する', EN: 'Send Payment' })}
            </button>
          </div>
        )}

        {/* 送金中 */}
        {status === 'sending' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>{t({ JP: '送金処理中...', EN: 'Processing payment...' })}</p>
          </div>
        )}

        {/* 送金完了 */}
        {status === 'sent' && (
          <div className="text-center">
            <div className="text-green-500 mb-4">✓</div>
            <p>{t({ JP: '送金完了！確認中...', EN: 'Payment sent! Confirming...' })}</p>
          </div>
        )}

        {/* 確認完了 */}
        {status === 'confirmed' && (
          <div className="text-center">
            <div className="text-green-500 mb-4">✓</div>
            <p>{t({ JP: '決済完了！商品を発送します', EN: 'Payment confirmed! Shipping your order' })}</p>
          </div>
        )}
      </div>
    </div>
  )
}
```

### **4. Alchemy Webhook処理**

```typescript
// app/api/crypto/webhook/alchemy/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/connection'
import { alchemy } from '@/lib/crypto/alchemy'

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    // Alchemy Webhookの署名検証
    const signature = request.headers.get('x-alchemy-signature')
    if (!verifyAlchemySignature(webhookData, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { activity } = webhookData
    
    for (const tx of activity) {
      const { toAddress, value, hash, blockNum } = tx
      
      // 対応する注文を検索
      const order = await prisma.order.findFirst({
        where: {
          cryptoAddress: toAddress,
          status: 'PENDING_PAYMENT'
        }
      })

      if (!order) continue

      // 金額の照合
      const expectedAmount = BigInt(order.cryptoAmount!.toString())
      const receivedAmount = BigInt(value)
      
      if (receivedAmount >= expectedAmount) {
        // トランザクション記録を作成
        await prisma.cryptoTransaction.create({
          data: {
            orderId: order.id,
            transactionHash: hash,
            toAddress,
            amount: order.cryptoAmount!,
            blockNumber: blockNum,
            status: 'PENDING'
          }
        })

        // 注文ステータスを更新
        await prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_RECEIVED' }
        })

        // 顧客に通知
        await sendPaymentConfirmationEmail(order.customerEmail, order.id)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Alchemy webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 🔧 環境変数設定

```bash
# .env.local
# Alchemy設定
ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_WEBHOOK_SECRET=your_webhook_secret_here

# Privy設定
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# データベース
DATABASE_URL=your_database_url_here

# ウォレット設定
MASTER_XPUB=your_master_xpub_here

# メール設定
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

## 📦 必要なパッケージ

```bash
npm install @alchemy-sdk/core @privy-io/react-auth @privy-io/server-auth
npm install ethers bip32 bip39
npm install @types/bip32 @types/bip39
```

## 🚀 実装順序

### **Phase 1: 基盤構築**
1. **Alchemy統合**: Web3プロバイダー設定
2. **Privy統合**: 顧客ウォレット設定
3. **データベース**: スキーマ更新

### **Phase 2: 決済フロー**
1. **ログイン機能**: Privy認証実装
2. **アドレス生成**: Alchemy xpub統合
3. **支払い画面**: 統合UI実装

### **Phase 3: 監視・検知**
1. **Webhook設定**: Alchemy通知設定
2. **入金検知**: 自動処理実装
3. **確認処理**: トランザクション確認

### **Phase 4: 統合・テスト**
1. **全体統合**: エンドツーエンドテスト
2. **セキュリティ**: 署名検証・認証
3. **パフォーマンス**: 最適化・監視

この統合設計により、開発コストを大幅に削減し、セキュリティとユーザー体験を向上させることができます。
