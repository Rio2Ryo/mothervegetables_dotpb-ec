# Mother Vegetables - 仮想通貨決済ECサイト

## 📋 プロジェクト概要

ShopifyベースのECサイトに仮想通貨決済機能を統合したプロジェクトです。Privyによる埋め込みウォレットとAlchemyによる入金検知を活用し、独自コインでの決済を可能にします。

## 🚀 クイックスタート

### **必要な環境**
- Node.js 18+
- PostgreSQL
- Shopifyストア
- Alchemyアカウント
- Privyアカウント

### **インストール**
```bash
# リポジトリクローン
git clone https://github.com/Rio2Ryo/mothervegetables_dotpb.git
cd mothervegetables_dotpb

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
# .env.localを編集して必要な値を設定

# データベースセットアップ
npx prisma migrate dev
npx prisma generate

# 開発サーバー起動
npm run dev
```

### **環境変数設定**
```bash
# Shopify設定
NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_token

# Privy設定
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
PRIVY_APP_SECRET=your_privy_app_secret

# Alchemy設定
ALCHEMY_API_KEY=your_alchemy_api_key

# データベース
DATABASE_URL=your_database_url
```

## 📁 プロジェクト構造

```
mothervegetables_dotpb/
├── docs/                          # 📚 ドキュメント
│   ├── requirements/              # 要件定義
│   ├── implementation/            # 実装計画
│   ├── integration/               # 統合設計
│   ├── api/                      # API仕様
│   ├── database/                 # データベース設計
│   └── security/                 # セキュリティ
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── api/                  # API Routes
│   │   ├── cart/                 # カートページ
│   │   └── payment/              # 決済ページ
│   ├── components/               # Reactコンポーネント
│   │   ├── cart/                 # カート関連
│   │   └── crypto/               # 仮想通貨関連
│   ├── contexts/                 # React Context
│   ├── lib/                      # ライブラリ・ユーティリティ
│   └── types/                    # TypeScript型定義
├── prisma/                       # データベーススキーマ
└── public/                       # 静的ファイル
```

## 🛠️ 技術スタック

### **フロントエンド**
- **Next.js 14** - Reactフレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **React Query** - データフェッチング

### **バックエンド**
- **Next.js API Routes** - API実装
- **PostgreSQL** - データベース
- **Prisma** - ORM
- **Alchemy SDK** - Web3プロバイダー
- **Privy React** - ウォレット管理

### **外部サービス**
- **Shopify** - EC機能
- **Alchemy** - Web3インフラ
- **Privy** - 埋め込みウォレット

## 🔧 開発コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# データベースマイグレーション
npx prisma migrate dev

# Prisma Studio起動
npx prisma studio

# 型チェック
npm run type-check

# リント
npm run lint
```

## 📊 機能一覧

### **✅ 実装済み**
- [x] Shopify商品表示
- [x] ショッピングカート
- [x] 多言語対応（日本語/英語）
- [x] 動的通貨表示
- [x] クレジットカード決済

### **🚧 開発中**
- [ ] Privy認証統合
- [ ] Alchemy入金検知
- [ ] 仮想通貨決済フロー

### **📋 計画中**
- [ ] 自動確認処理
- [ ] セキュリティ強化
- [ ] パフォーマンス最適化

## 📚 ドキュメント

詳細なドキュメントは `docs/` フォルダを参照してください：

- **[要件定義](docs/requirements/)** - 機能要件と技術要件
- **[実装計画](docs/implementation/)** - 開発計画と責任分担
- **[統合設計](docs/integration/)** - 外部サービス統合
- **[API仕様](docs/api/)** - API設計と設定手順
- **[データベース設計](docs/database/)** - データベーススキーマ
- **[セキュリティ](docs/security/)** - セキュリティ要件と対策

## 🎯 決済フロー

### **クレジットカード決済**
```
1. 商品選択 → 2. カート追加 → 3. 決済選択 → 4. Shopify Checkout → 5. 完了
```

### **仮想通貨決済**
```
1. Privyログイン → 2. 商品選択 → 3. カート追加 → 4. 仮想通貨決済選択
5. アドレス生成 → 6. 送金 → 7. 入金検知 → 8. 自動確認 → 9. 完了
```

## 🔐 セキュリティ

- **暗号化**: データの暗号化とセキュアな通信
- **認証**: 多要素認証とセッション管理
- **監視**: リアルタイム監視とログ記録
- **コンプライアンス**: 関連規制への準拠

## 🚀 デプロイ

### **Vercel（推奨）**
```bash
# Vercel CLIインストール
npm i -g vercel

# デプロイ
vercel --prod
```

### **環境変数設定**
本番環境では以下の環境変数を設定してください：
- `DATABASE_URL`
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `NEXT_PUBLIC_PRIVY_APP_ID`
- `PRIVY_APP_SECRET`
- `ALCHEMY_API_KEY`

## 📞 サポート

### **技術的な問題**
- GitHub Issuesで報告
- ドキュメントを確認
- コミュニティで質問

### **ビジネス関連**
- サポートチームに連絡
- ドキュメントを参照

## 📄 ライセンス

このプロジェクトはMITライセンスの下で公開されています。

## 🤝 コントリビューション

1. フォークを作成
2. フィーチャーブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

**最終更新**: 2024年9月21日
**バージョン**: 1.0.0
**ステータス**: 開発中