# Shopify設定ガイド

## 必要な環境変数

`.env.local` ファイルを作成し、以下の環境変数を設定してください：

```env
# Shopify Storefront API設定
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT=https://your-store.myshopify.com/api/2023-10/graphql.json
NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN=your_storefront_access_token_here

# Shopify Admin API設定（将来の拡張用）
SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_ACCESS_TOKEN=your_admin_api_access_token_here

# Privy設定
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here

# microCMS設定
MICROCMS_SERVICE_DOMAIN=your-service-domain
MICROCMS_API_KEY=your_api_key_here

# データベース設定（PostgreSQL）
DATABASE_URL=postgresql://username:password@localhost:5432/mothervegetables_db

# Alchemy設定
ALCHEMY_API_KEY=your_alchemy_api_key_here
MASTER_XPUB=your_master_xpub_here

# その他の設定
NEXTAUTH_SECRET=your_nextauth_secret_here
NEXTAUTH_URL=http://localhost:3000
```

## Shopify Storefront API設定手順

### 1. Shopify AdminでPrivate Appを作成

1. Shopify Adminにログイン
2. 「Settings」→「Apps and sales channels」→「Develop apps」→「Create an app」
3. アプリ名を入力（例：Mother Vegetables Customer API）
4. 「Admin API access scopes」で以下の権限を設定：
   - `read_customers`
   - `write_customers`
5. 「Storefront API access scopes」で以下の権限を設定：
   - `unauthenticated_read_product_listings`
   - `unauthenticated_read_product_inventory`
   - `unauthenticated_write_checkouts`
   - `unauthenticated_read_checkouts`

### 2. Storefront Access Tokenを取得

1. 作成したアプリの「API credentials」タブを開く
2. 「Storefront access token」をコピー
3. `.env.local`の`NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`に設定

### 3. Storefront APIエンドポイントURLを設定

```
https://your-store.myshopify.com/api/2023-10/graphql.json
```

`your-store`の部分を実際のストア名に置き換えてください。

## 実装済み機能

### ✅ ユーザー登録
- ユーザー情報をShopifyに登録
- 自動ログイン機能
- バリデーション機能

### ✅ ユーザーログイン
- メールアドレス・パスワード認証
- セッション管理（httpOnly Cookie）
- エラーハンドリング

### ✅ ユーザー情報管理
- プロフィール情報の取得
- セッション状態の確認
- ログアウト機能

### ✅ セキュリティ
- httpOnly Cookieによるセッション管理
- CSRF保護
- 入力値バリデーション

## 使用方法

1. 環境変数を設定
2. 開発サーバーを起動：`npm run dev`
3. 登録フォームで新しいユーザーを作成
4. ログインフォームで既存ユーザーでログイン
5. ヘッダーでログイン状態を確認

## トラブルシューティング

### エラー：Shopify Storefront API設定が不足しています
- `.env.local`ファイルが存在するか確認
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT`と`NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`が設定されているか確認

### エラー：GraphQL errors
- Storefront Access Tokenの権限を確認
- ストア名が正しいか確認
- APIエンドポイントURLが正しいか確認

### エラー：顧客が見つかりません
- メールアドレスとパスワードが正しいか確認
- Shopifyストアでユーザーが作成されているか確認

