# Google ログイン機能の設定ガイド

## 概要

このドキュメントでは、Google ログイン機能の設定方法について説明します。

## 必要な環境変数

`.env.local`ファイルに以下の環境変数を追加してください：

```env
# Google OAuth設定
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# NextAuth.js設定
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_key
```

## Google Cloud Console設定

### 1. Google Cloud Consoleでプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/)にアクセス
2. 新しいプロジェクトを作成または既存のプロジェクトを選択

### 2. OAuth 2.0認証情報を作成

1. 「APIとサービス」→「認証情報」に移動
2. 「認証情報を作成」→「OAuth 2.0 クライアント ID」を選択
3. アプリケーションの種類を「ウェブアプリケーション」に設定
4. 承認済みのリダイレクト URIを追加：
   - 開発環境: `http://localhost:3000/api/auth/callback/google`
   - 本番環境: `https://yourdomain.com/api/auth/callback/google`

### 3. 認証情報を取得

1. 作成したOAuth 2.0クライアントIDの詳細を表示
2. クライアントIDとクライアントシークレットをコピー
3. `.env.local`ファイルに設定

## NextAuth.js設定

### 1. NEXTAUTH_SECRETの生成

```bash
openssl rand -base64 32
```

生成された文字列を`NEXTAUTH_SECRET`に設定してください。

### 2. NEXTAUTH_URLの設定

- 開発環境: `http://localhost:3000`
- 本番環境: `https://yourdomain.com`

## 実装済み機能

### ✅ Google OAuth認証
- NextAuth.jsを使用したGoogle ログイン
- Shopifyとの連携
- セッション管理

### ✅ ユーザー体験
- Google ログインボタン
- エラーハンドリング
- ローディング状態の表示

### ✅ セキュリティ
- httpOnly Cookieによるセッション管理
- CSRF保護
- 安全なリダイレクト

## 使用方法

1. 環境変数を設定
2. 開発サーバーを起動：`npm run dev`
3. ログインモーダルで「Google でログイン」ボタンをクリック
4. Google認証画面でログイン
5. 自動的にShopifyアカウントと連携

## トラブルシューティング

### エラー：Google ログインに失敗しました
- Google Cloud Consoleの設定を確認
- リダイレクトURIが正しく設定されているか確認
- クライアントIDとシークレットが正しいか確認

### エラー：認証に失敗しました
- Shopifyの設定を確認
- ネットワーク接続を確認
- ブラウザのCookie設定を確認

### エラー：顧客の作成に失敗しました
- Shopify Storefront APIの設定を確認
- アクセストークンの権限を確認

## セキュリティ考慮事項

1. **環境変数の保護**: `.env.local`ファイルを`.gitignore`に追加
2. **HTTPSの使用**: 本番環境では必ずHTTPSを使用
3. **リダイレクトURIの制限**: 許可されたドメインのみを設定
4. **セッションの有効期限**: 適切なセッション有効期限を設定

## 参考リンク

- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Shopify Storefront API](https://shopify.dev/docs/api/storefront)

