# Mother Vegetables - 仮想通貨決済ECサイト

## 📋 プロジェクト概要

ShopifyベースのECサイトに仮想通貨決済機能を統合したプロジェクトです。Privyによる埋め込みウォレットとAlchemyによる入金検知を活用し、独自コインでの決済を可能にします。

## 🏗️ アーキテクチャ

### **技術スタック**
- **フロントエンド**: Next.js 14, TypeScript, Tailwind CSS
- **バックエンド**: Next.js API Routes, PostgreSQL, Prisma
- **Web3**: Alchemy SDK, Privy React
- **EC**: Shopify Storefront API, Admin API
- **認証**: Privy (MPC方式埋め込みウォレット)

### **外部サービス**
- **Alchemy**: Web3プロバイダー、入金検知
- **Privy**: 顧客ウォレット管理
- **Shopify**: EC機能、商品管理

## 📁 ドキュメント構成

### **📋 requirements/ - 要件定義**
- [仮想通貨決済機能要件定義](./requirements/CRYPTO_PAYMENT_REQUIREMENTS.md)
  - 機能概要、決済フロー、技術要件
  - セキュリティ要件、データベース設計

### **🛠️ implementation/ - 実装計画**
- [実装計画書](./implementation/CRYPTO_PAYMENT_IMPLEMENTATION_PLAN.md)
  - スケジュール、技術スタック、プロジェクト構造
- [責任分担表](./implementation/CRYPTO_PAYMENT_RESPONSIBILITIES.md)
  - 開発者とユーザーの役割分担
- [Privy+Shopify統合実装例](./implementation/PRIVY_SHOPIFY_IMPLEMENTATION_EXAMPLE.md)
  - 具体的なコード実装例

### **🔗 integration/ - 統合設計**
- [Alchemy+Privy統合設計](./integration/CRYPTO_PAYMENT_SERVICE_INTEGRATION.md)
  - 外部サービス統合の詳細設計
- [Privy+Shopify統合設計](./integration/PRIVY_SHOPIFY_INTEGRATION.md)
  - 認証統合とユーザー同期

### **🌐 api/ - API仕様**
- [Shopify Checkout言語設定](./api/SHOPIFY_CHECKOUT_LANGUAGE_SETUP.md)
  - チェックアウト画面の多言語対応

### **🗄️ database/ - データベース設計**
- データベーススキーマ（今後追加予定）

### **🔐 security/ - セキュリティ**
- セキュリティ要件（今後追加予定）

## 🚀 機能概要

### **決済フロー**
```
1. ユーザーがPrivyでログイン
2. カートに商品を追加
3. 決済方法選択（クレジットカード/仮想通貨）
4. 仮想通貨選択時：
   - Alchemyで受取アドレス生成
   - 顧客がPrivyウォレットから送金
   - 入金検知・自動確認
   - 商品発送
```

### **統合機能**
- **シングルサインオン**: PrivyログインでShopify機能も利用可能
- **統合カート**: クレジットカードと仮想通貨の両方で決済可能
- **統合履歴**: 購入履歴と仮想通貨決済履歴を一元管理

## 🛠️ 開発環境セットアップ

### **必要な環境変数**
```bash
# Shopify設定
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token
SHOPIFY_ADMIN_ACCESS_TOKEN=your_admin_token

# Privy設定
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Alchemy設定
ALCHEMY_API_KEY=your_alchemy_api_key

# データベース
DATABASE_URL=your_database_url
```

### **インストール手順**
```bash
# 依存関係のインストール
npm install

# データベースマイグレーション
npx prisma migrate dev

# 開発サーバー起動
npm run dev
```

## 📊 実装状況

### **✅ 完了済み**
- [x] Shopify基本統合
- [x] カート機能実装
- [x] 決済方法選択UI
- [x] 多言語対応（日本語/英語）
- [x] 動的通貨表示

### **🚧 実装中**
- [ ] Privy統合
- [ ] Alchemy統合
- [ ] 仮想通貨決済フロー

### **📋 計画中**
- [ ] 入金検知システム
- [ ] 自動確認処理
- [ ] セキュリティ強化
- [ ] パフォーマンス最適化

## 🔧 開発ガイド

### **責任分担**
- **開発者（AI）**: コード実装、API設計、セキュリティ実装
- **ユーザー**: 外部サービス設定、環境構築、本番デプロイ

### **実装フェーズ**
1. **Phase 1**: 基盤構築（Week 1-2）
2. **Phase 2**: 決済フロー（Week 3-4）
3. **Phase 3**: 監視・検知（Week 5-6）
4. **Phase 4**: 統合・テスト（Week 7-8）

## 📞 サポート

### **技術的な問題**
- コード実装・デバッグ
- 統合エラーの修正
- パフォーマンス最適化

### **設定・運用**
- 外部サービス設定
- 環境構築・設定
- 本番環境デプロイ

## 📈 成功指標

### **技術指標**
- 可用性: 99.9%以上
- レスポンス時間: 3秒以内
- エラー率: 0.1%以下

### **ビジネス指標**
- 決済完了率: 95%以上
- 顧客満足度: 4.5/5以上
- サポート問い合わせ: 5%以下

---

**最終更新**: 2024年9月20日  
**バージョン**: 1.0.0  
**ステータス**: 開発中
