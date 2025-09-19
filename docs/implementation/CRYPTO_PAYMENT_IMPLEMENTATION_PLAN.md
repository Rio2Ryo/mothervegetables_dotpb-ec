# 仮想通貨決済機能 実装計画書

## 🎯 実装概要

独自コイン決済機能を段階的に実装し、安全で使いやすい決済システムを構築する。

## 📅 実装スケジュール

### **Week 1-2: 基盤構築**
- [ ] データベース設計・構築
- [ ] ウォレット管理システム
- [ ] 基本的なAPI設計

### **Week 3-4: 決済フロー**
- [ ] 注文受付機能
- [ ] アドレス生成機能
- [ ] 支払い画面UI

### **Week 5-6: 監視・検知**
- [ ] Web3プロバイダー連携
- [ ] 入金検知システム
- [ ] Webhook処理

### **Week 7-8: 統合・テスト**
- [ ] 全体統合
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

## 🛠 技術スタック選択

### **推奨技術**
```typescript
// フロントエンド
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- React Query (状態管理)

// バックエンド
- Next.js API Routes
- PostgreSQL (データベース)
- Prisma (ORM)

// Web3
- ethers.js v6
- bip39/bip32 (HDウォレット)
- qrcode (QRコード生成)

// インフラ
- Moralis (Web3プロバイダー)
- Vercel (デプロイ)
- Upstash (Redis)
```

## 📁 プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   ├── crypto/
│   │   │   ├── generate-address/route.ts
│   │   │   ├── webhook/
│   │   │   │   └── deposit/route.ts
│   │   │   └── orders/
│   │   │       ├── [orderId]/route.ts
│   │   │       └── route.ts
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
│   │   ├── AddressDisplay.tsx
│   │   ├── QRCodeDisplay.tsx
│   │   └── PaymentStatus.tsx
│   └── ui/
│       ├── Button.tsx
│       └── Loading.tsx
├── lib/
│   ├── crypto/
│   │   ├── wallet.ts
│   │   ├── address-generator.ts
│   │   └── web3-provider.ts
│   ├── database/
│   │   ├── schema.prisma
│   │   └── connection.ts
│   └── utils/
│       ├── validation.ts
│       └── encryption.ts
├── types/
│   ├── crypto.ts
│   ├── order.ts
│   └── payment.ts
└── hooks/
    ├── useCryptoPayment.ts
    └── useOrderStatus.ts
```

## 🔧 実装詳細

### **1. データベース設計**

```prisma
// schema.prisma
model Order {
  id                String   @id @default(cuid())
  customerEmail     String
  items             Json
  totalAmount       Decimal
  currency          String
  paymentMethod     String
  status            OrderStatus
  cryptoAddress     String?
  cryptoAmount      Decimal?
  expiresAt         DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  cryptoTransactions CryptoTransaction[]
}

model CryptoTransaction {
  id                String   @id @default(cuid())
  orderId           String
  order             Order    @relation(fields: [orderId], references: [id])
  transactionHash   String   @unique
  fromAddress       String
  toAddress         String
  amount            Decimal
  blockNumber       BigInt?
  confirmationCount Int      @default(0)
  status            TransactionStatus @default(PENDING)
  createdAt         DateTime @default(now())
}

enum OrderStatus {
  PENDING_PAYMENT
  PAYMENT_RECEIVED
  SHIPPED
  DELIVERED
  CANCELLED
}

enum TransactionStatus {
  PENDING
  CONFIRMED
  FAILED
}
```

### **2. ウォレット管理**

```typescript
// lib/crypto/wallet.ts
import { HDNodeWallet, Mnemonic } from 'ethers'
import { encrypt, decrypt } from '@/lib/utils/encryption'

export class WalletManager {
  private masterWallet: HDNodeWallet
  private derivationPath = "m/44'/60'/0'/0"

  constructor(mnemonicPhrase: string, password: string) {
    const mnemonic = Mnemonic.fromPhrase(mnemonicPhrase)
    this.masterWallet = HDNodeWallet.fromMnemonic(mnemonic, this.derivationPath)
  }

  generateAddress(orderId: string): string {
    const path = `${this.derivationPath}/${orderId}`
    const wallet = this.masterWallet.deriveChild(path)
    return wallet.address
  }

  async signTransaction(tx: any): Promise<string> {
    // トランザクション署名ロジック
    return this.masterWallet.signTransaction(tx)
  }
}
```

### **3. アドレス生成API**

```typescript
// app/api/crypto/generate-address/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { WalletManager } from '@/lib/crypto/wallet'
import { prisma } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json()
    
    // 注文データを取得
    const order = await prisma.order.findUnique({
      where: { id: orderId }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // ウォレットマネージャーを初期化
    const walletManager = new WalletManager(
      process.env.MASTER_MNEMONIC!,
      process.env.WALLET_PASSWORD!
    )

    // アドレスを生成
    const address = walletManager.generateAddress(orderId)
    
    // 有効期限を設定（24時間）
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // 注文を更新
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        cryptoAddress: address,
        cryptoAmount: order.totalAmount,
        expiresAt
      }
    })

    return NextResponse.json({
      address,
      amount: order.totalAmount,
      currency: order.currency,
      expiresAt,
      orderId
    })
  } catch (error) {
    console.error('Address generation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

### **4. 支払い画面コンポーネント**

```typescript
// components/crypto/PaymentForm.tsx
'use client'

import { useState, useEffect } from 'react'
import QRCode from 'qrcode'
import { AddressDisplay } from './AddressDisplay'
import { PaymentStatus } from './PaymentStatus'

interface PaymentFormProps {
  orderId: string
  address: string
  amount: number
  currency: string
  expiresAt: string
}

export function PaymentForm({ orderId, address, amount, currency, expiresAt }: PaymentFormProps) {
  const [qrCode, setQrCode] = useState<string>('')
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [status, setStatus] = useState<'waiting' | 'confirming' | 'confirmed'>('waiting')

  useEffect(() => {
    // QRコード生成
    QRCode.toDataURL(address, { width: 256 }, (err, url) => {
      if (err) console.error(err)
      else setQrCode(url)
    })

    // カウントダウンタイマー
    const interval = setInterval(() => {
      const now = Date.now()
      const expiry = new Date(expiresAt).getTime()
      const diff = expiry - now
      
      if (diff <= 0) {
        setTimeLeft(0)
        clearInterval(interval)
      } else {
        setTimeLeft(diff)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [address, expiresAt])

  const formatTime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60))
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((ms % (1000 * 60)) / 1000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center">仮想通貨決済</h2>
      
      <div className="space-y-6">
        <AddressDisplay address={address} />
        
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">
            {amount} {currency}
          </p>
          {qrCode && (
            <img src={qrCode} alt="QR Code" className="mx-auto border rounded" />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600 mb-1">残り時間</p>
          <p className="text-xl font-mono font-bold text-red-600">
            {formatTime(timeLeft)}
          </p>
        </div>

        <PaymentStatus status={status} />
      </div>
    </div>
  )
}
```

### **5. Webhook処理**

```typescript
// app/api/crypto/webhook/deposit/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/database/connection'

export async function POST(request: NextRequest) {
  try {
    const webhookData = await request.json()
    
    // 署名検証
    const signature = request.headers.get('x-signature')
    if (!verifyWebhookSignature(webhookData, signature)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const { address, amount, transactionHash, blockNumber } = webhookData

    // 対応する注文を検索
    const order = await prisma.order.findFirst({
      where: {
        cryptoAddress: address,
        status: 'PENDING_PAYMENT'
      }
    })

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // 金額の照合
    if (amount !== order.cryptoAmount) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // 有効期限の確認
    if (new Date() > order.expiresAt!) {
      return NextResponse.json({ error: 'Payment expired' }, { status: 400 })
    }

    // トランザクション記録を作成
    await prisma.cryptoTransaction.create({
      data: {
        orderId: order.id,
        transactionHash,
        fromAddress: webhookData.fromAddress,
        toAddress: address,
        amount,
        blockNumber,
        status: 'PENDING'
      }
    })

    // 注文ステータスを更新
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_RECEIVED' }
    })

    // 顧客に通知（メール等）
    await sendPaymentConfirmationEmail(order.customerEmail, order.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

## 🧪 テスト戦略

### **単体テスト**
- [ ] ウォレット管理機能
- [ ] アドレス生成機能
- [ ] データベース操作
- [ ] API エンドポイント

### **統合テスト**
- [ ] 決済フロー全体
- [ ] Webhook処理
- [ ] エラーハンドリング

### **セキュリティテスト**
- [ ] 入力検証
- [ ] 認証・認可
- [ ] SQL インジェクション
- [ ] XSS 対策

## 🚀 デプロイ戦略

### **環境構成**
- **開発環境**: ローカル開発
- **ステージング環境**: Vercel Preview
- **本番環境**: Vercel Production

### **環境変数**
```bash
# 本番環境
MASTER_MNEMONIC=your_master_mnemonic_phrase
WALLET_PASSWORD=your_wallet_password
DATABASE_URL=your_production_database_url
MORALIS_API_KEY=your_moralis_api_key
WEBHOOK_SECRET=your_webhook_secret
```

## 📊 監視・ログ

### **監視項目**
- [ ] API レスポンス時間
- [ ] データベース接続
- [ ] Webhook受信状況
- [ ] エラー発生率

### **ログ設定**
- [ ] 構造化ログ（JSON形式）
- [ ] ログレベル設定
- [ ] ログローテーション
- [ ] セキュリティログ

## 🔐 セキュリティ対策

### **実装すべき対策**
- [ ] HTTPS 強制
- [ ] CORS 設定
- [ ] レート制限
- [ ] 入力検証
- [ ] SQL インジェクション対策
- [ ] XSS 対策
- [ ] CSRF 対策

### **監査項目**
- [ ] セキュリティヘッダー
- [ ] 認証・認可
- [ ] データ暗号化
- [ ] ログ監査
