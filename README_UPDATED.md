# Mother Vegetables - Shopify専用暗号通貨決済システム

## 🎯 プロジェクト概要

Shopifyをマスタデータベースとして使用し、暗号通貨決済機能を提供するNext.jsアプリケーションです。

## 🏗️ アーキテクチャ

### **データ管理**
- **Shopify**: マスタデータベース（注文、顧客、商品管理）
- **メタフィールド**: 暗号通貨決済情報の保存
- **独自DB**: なし（完全にShopifyに依存）

### **技術スタック**
- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **認証**: MetaMask (Wagmi)
- **決済**: 暗号通貨 + Shopify統合
- **Web3**: Alchemy SDK, Ethers.js
- **デプロイ**: Vercel

## 🚀 主要機能

### **1. 暗号通貨決済**
- MetaMaskウォレット連携
- 決定論的アドレス生成
- 自動支払い確認
- Shopify注文との連携

### **2. Shopify統合**
- 注文管理
- 顧客管理
- 商品管理
- 在庫管理

### **3. 決済フロー**
```
1. 顧客がMetaMaskで接続
2. カートに商品を追加
3. 暗号通貨決済を選択
4. 決済アドレスを生成
5. Shopify注文を作成
6. 顧客が暗号通貨で送金
7. Alchemy Webhookで支払い確認
8. Shopify注文を更新
```

## 📁 プロジェクト構造

```
src/
├── app/
│   ├── api/
│   │   └── crypto/
│   │       ├── generate-address/route.ts
│   │       ├── payment-status/route.ts
│   │       └── webhook/alchemy/route.ts
│   └── [pages]
├── components/
│   └── crypto/
├── contexts/
│   ├── MetaMaskAuthContext.tsx
│   └── MetaMaskShopifyCartContext.tsx
├── lib/
│   ├── shopify/
│   │   └── order-manager.ts
│   └── crypto/
│       ├── wallet-manager.ts
│       └── alchemy-service.ts
└── hooks/
    └── useCartWithAgentDiscount.ts
```

## 🔧 環境設定

### **必要な環境変数**
```bash
# Shopify設定
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token

# 暗号通貨決済設定
MASTER_SEED=your_master_seed_phrase_here
ALCHEMY_API_KEY=your_alchemy_api_key
ALCHEMY_WEBHOOK_SECRET=your_webhook_secret
NETWORK=mainnet

# アプリケーション設定
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### **セットアップ手順**
```bash
# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev
```

## 🛠️ 主要な実装

### **Shopify注文管理**
```typescript
const orderManager = new ShopifyOrderManager()

// 注文作成
const order = await orderManager.createOrder({
  lineItems: items,
  totalPrice: '100.00',
  customerEmail: 'customer@example.com'
})

// 暗号通貨決済情報を追加
await orderManager.addCryptoPaymentInfo(order.id, {
  transactionHash: '0x...',
  fromAddress: '0x...',
  toAddress: '0x...',
  amount: '100.00',
  currency: 'ETH'
})
```

### **暗号通貨決済**
```typescript
const walletManager = new WalletManager(masterSeed)
const { address } = walletManager.generateAddressForOrder(orderId)

// Alchemy Webhookで支払い確認
const alchemyService = new AlchemyService(apiKey)
const balance = await alchemyService.getBalance(address)
```

## 📊 データフロー

### **注文作成**
1. フロントエンドでカート情報を準備
2. `/api/crypto/generate-address`でアドレス生成
3. Shopify注文を作成
4. 暗号通貨情報をメタフィールドに保存

### **支払い確認**
1. 顧客が暗号通貨で送金
2. Alchemy Webhookが支払いを検知
3. Shopify注文を検索
4. 支払い金額を確認
5. Shopify注文ステータスを更新

## 🎯 メリット

### **✅ シンプル化**
- データベース不要
- インフラコスト削減
- メンテナンス軽減

### **✅ Shopify統合**
- 一元管理
- 既存のShopify機能活用
- 管理画面での確認可能

### **✅ スケーラビリティ**
- Shopifyの堅牢なインフラ
- 自動バックアップ
- 高可用性

## 🔒 セキュリティ

- Webhook署名検証
- 暗号通貨アドレスの決定論的生成
- Shopify API認証
- 環境変数による設定管理

## 📈 今後の拡張

- 複数暗号通貨対応
- 自動配送処理
- 顧客通知システム
- 分析・レポート機能
