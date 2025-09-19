# 仮想通貨決済機能 要件定義書

## 📋 概要

独自コインを使用した仮想通貨決済機能を実装し、従来のクレジットカード決済と並行して提供する。

## 🎯 機能概要

### **決済フロー**
```
ECサイト → 注文受付 → 受取アドレス発行 → 顧客送金 → 入金検知 → 照合・反映 → 商品発送
```

## 🔄 詳細フロー

### **1. 注文受付**
- **トリガー**: ECサイトで「独自コイン払い」を選択
- **処理内容**:
  - 注文データをバックエンドに送信
  - 注文ステータス: `pending_payment` に設定
  - 注文IDを生成し、一意性を保証

**データ構造**:
```typescript
interface Order {
  id: string
  customerEmail: string
  items: CartItem[]
  totalAmount: number
  currency: string
  paymentMethod: 'crypto'
  status: 'pending_payment' | 'payment_received' | 'shipped' | 'delivered'
  cryptoAddress?: string
  cryptoAmount?: number
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}
```

### **2. 受取アドレス発行**
- **トリガー**: 注文データ受信後
- **処理内容**:
  - バックエンドが親ウォレット（xpub）から注文専用アドレスを生成
  - 注文に紐づけて保存
  - 顧客へ案内（メール/画面表示）

**技術要件**:
- **ウォレット管理**: HDウォレット（BIP44準拠）
- **アドレス生成**: 注文毎に一意のアドレス
- **セキュリティ**: プライベートキーの安全な管理

**API仕様**:
```typescript
// アドレス生成API
POST /api/crypto/generate-address
{
  orderId: string
}

// レスポンス
{
  address: string
  amount: number
  currency: string
  expiresAt: string
  qrCode: string // Base64エンコードされたQRコード
}
```

### **3. 顧客送金**
- **表示内容**:
  - 支払い先アドレス
  - 支払い金額
  - QRコード
  - 有効期限
  - 入金確認状況

**UI要件**:
```typescript
interface PaymentPageProps {
  orderId: string
  address: string
  amount: number
  currency: string
  expiresAt: Date
  status: 'waiting' | 'confirming' | 'confirmed'
}
```

### **4. 入金検知**
- **技術スタック**: Web3インフラ（Moralis/QuickNode等）
- **検知方法**: ブロックチェーン監視
- **通知方法**: Webhookでバックエンドに通知

**Webhook仕様**:
```typescript
// 入金検知Webhook
POST /api/crypto/webhook/deposit
{
  address: string
  amount: number
  transactionHash: string
  blockNumber: number
  timestamp: number
}
```

### **5. 照合と反映**
- **照合項目**:
  - 金額の一致
  - アドレスの一致
  - 有効期限の確認
  - 承認数の確認

- **処理内容**:
  - 注文データと照合
  - 問題なければ注文を「入金済み」に更新
  - 商品発送開始

## 🛠 技術要件

### **フロントエンド**
- **フレームワーク**: Next.js 14
- **状態管理**: React Context + useReducer
- **UI**: Tailwind CSS
- **QRコード生成**: qrcode.js

### **バックエンド**
- **フレームワーク**: Next.js API Routes
- **データベース**: PostgreSQL / MongoDB
- **ウォレット管理**: HDウォレット（bip32/bip39）
- **Web3**: ethers.js / web3.js

### **インフラ**
- **Web3プロバイダー**: Moralis / QuickNode / Alchemy
- **監視**: ブロックチェーンイベント監視
- **通知**: Webhook / Server-Sent Events

## 📊 データベース設計

### **Orders Table**
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_email VARCHAR(255) NOT NULL,
  items JSONB NOT NULL,
  total_amount DECIMAL(18,8) NOT NULL,
  currency VARCHAR(10) NOT NULL,
  payment_method VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL,
  crypto_address VARCHAR(255),
  crypto_amount DECIMAL(18,8),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### **CryptoTransactions Table**
```sql
CREATE TABLE crypto_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  transaction_hash VARCHAR(255) UNIQUE,
  from_address VARCHAR(255),
  to_address VARCHAR(255),
  amount DECIMAL(18,8),
  block_number BIGINT,
  confirmation_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔐 セキュリティ要件

### **ウォレット管理**
- **マルチシグ**: 複数のキーによる署名
- **コールドストレージ**: プライベートキーのオフライン保存
- **定期バックアップ**: ウォレットの定期バックアップ

### **API セキュリティ**
- **認証**: JWT Token
- **レート制限**: API呼び出し頻度制限
- **入力検証**: 全ての入力データの検証

### **監視・ログ**
- **監査ログ**: 全ての取引の記録
- **アラート**: 異常な取引の検知
- **バックアップ**: データの定期バックアップ

## 📱 ユーザー体験

### **支払い画面**
1. **アドレス表示**: 大きなフォントで表示
2. **QRコード**: スキャンしやすいサイズ
3. **残り時間**: リアルタイムカウントダウン
4. **進捗表示**: 送金状況の可視化

### **通知機能**
- **メール通知**: 支払い完了時
- **プッシュ通知**: リアルタイム更新
- **SMS通知**: 重要なステータス変更時

## 🚀 実装フェーズ

### **Phase 1: 基盤構築**
- [ ] データベース設計・構築
- [ ] ウォレット管理システム
- [ ] 基本的なAPI設計

### **Phase 2: 決済フロー**
- [ ] 注文受付機能
- [ ] アドレス生成機能
- [ ] 支払い画面UI

### **Phase 3: 監視・検知**
- [ ] Web3プロバイダー連携
- [ ] 入金検知システム
- [ ] Webhook処理

### **Phase 4: 統合・テスト**
- [ ] 全体統合
- [ ] セキュリティテスト
- [ ] パフォーマンステスト

## 📈 成功指標

### **技術指標**
- **可用性**: 99.9%以上
- **レスポンス時間**: 3秒以内
- **エラー率**: 0.1%以下

### **ビジネス指標**
- **決済完了率**: 95%以上
- **顧客満足度**: 4.5/5以上
- **サポート問い合わせ**: 5%以下

## 🔧 運用要件

### **監視**
- **システム監視**: 24/7監視
- **取引監視**: リアルタイム監視
- **アラート**: 異常検知時の即座通知

### **メンテナンス**
- **定期メンテナンス**: 月1回
- **セキュリティ更新**: 随時
- **バックアップ**: 日次

## 📝 今後の拡張性

### **対応予定通貨**
- **Ethereum**: ETH, ERC-20トークン
- **Bitcoin**: BTC
- **Polygon**: MATIC, ERC-20トークン

### **機能拡張**
- **マルチチェーン対応**: 複数ブロックチェーン対応
- **NFT決済**: NFTを活用した決済
- **DeFi連携**: DeFiプロトコルとの連携
