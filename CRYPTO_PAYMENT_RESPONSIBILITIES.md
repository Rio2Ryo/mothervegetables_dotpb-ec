# 仮想通貨決済機能 責任分担表

## 🤖 私が実装する部分

### **1. コード実装**
- ✅ **フロントエンドコンポーネント**
  - 支払い画面（Privy統合）
  - QRコード表示
  - ステータス表示・ローディング
  - エラーハンドリング

- ✅ **API Routes**
  - アドレス生成（Alchemy xpub統合）
  - Alchemy Webhook処理
  - 注文管理API
  - トランザクション確認API

- ✅ **データベーススキーマ**
  - Prismaスキーマ更新
  - マイグレーション作成
  - 型定義（TypeScript）

- ✅ **統合ロジック**
  - Alchemy SDK統合
  - Privy認証統合
  - Webhook署名検証
  - トランザクション処理

### **2. プロジェクト構造**
- ✅ **ディレクトリ構成**
- ✅ **コンポーネント設計**
- ✅ **状態管理（React Context）**
- ✅ **カスタムフック**

### **3. セキュリティ実装**
- ✅ **入力検証・バリデーション**
- ✅ **API認証・レート制限**
- ✅ **Webhook署名検証**
- ✅ **エラーハンドリング**

## 👤 ユーザーが設定する部分

### **1. 外部サービスアカウント作成**
```bash
# 必要なアカウント
- Alchemy: https://dashboard.alchemy.com/
- Privy: https://dashboard.privy.io/
- データベース: PostgreSQL/MongoDB
```

### **2. 環境変数設定**
```bash
# .env.local に追加
ALCHEMY_API_KEY=your_alchemy_api_key_here
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id_here
PRIVY_APP_SECRET=your_privy_app_secret_here
DATABASE_URL=your_database_connection_string
MASTER_XPUB=your_master_xpub_here
ALCHEMY_WEBHOOK_SECRET=your_webhook_secret_here
```

### **3. Alchemy設定**
- ✅ **APIキー取得**: DashboardでAPIキー生成
- ✅ **Webhook設定**: 
  - URL: `https://yourdomain.com/api/crypto/webhook/alchemy`
  - タイプ: `ADDRESS_ACTIVITY`
  - 監視アドレス: 動的に追加
- ✅ **ネットワーク選択**: メインネット/テストネット

### **4. Privy設定**
- ✅ **アプリ作成**: Dashboardでアプリ作成
- ✅ **App ID取得**: フロントエンド用
- ✅ **App Secret取得**: バックエンド用
- ✅ **認証設定**: メール/SSO設定
- ✅ **ウォレット設定**: MPC方式有効化

### **5. ウォレット設定**
- ✅ **マスターxpub生成**: 
  ```bash
  # 新しいウォレット作成
  npx ethers wallet create
  # xpubを取得して設定
  ```
- ✅ **初期資金投入**: テスト用資金
- ✅ **バックアップ**: シードフレーズの安全な保管

### **6. データベース設定**
- ✅ **データベース作成**: PostgreSQL/MongoDB
- ✅ **接続設定**: 接続文字列設定
- ✅ **権限設定**: 適切な権限付与

## 📋 詳細な設定手順

### **Alchemy設定手順**
1. **アカウント作成**
   - https://dashboard.alchemy.com/ でアカウント作成
   - 新しいプロジェクト作成
   - ネットワーク選択（ETH Mainnet/Testnet）

2. **APIキー取得**
   - Dashboard → API Keys
   - HTTP API Key をコピー
   - `.env.local` に設定

3. **Webhook設定**
   - Dashboard → Webhooks
   - 新しいWebhook作成
   - URL: `https://yourdomain.com/api/crypto/webhook/alchemy`
   - Type: `ADDRESS_ACTIVITY`
   - 署名シークレット設定

### **Privy設定手順**
1. **アカウント作成**
   - https://dashboard.privy.io/ でアカウント作成
   - 新しいアプリ作成

2. **認証設定**
   - Authentication → Email/Password 有効化
   - SSO設定（Google/Apple等）

3. **ウォレット設定**
   - Embedded Wallets → Enable
   - Create on login: `users-without-wallets`
   - MPC方式有効化

4. **API設定**
   - App ID（フロントエンド用）
   - App Secret（バックエンド用）
   - `.env.local` に設定

### **ウォレット設定手順**
1. **マスターウォレット作成**
   ```bash
   # 新しいウォレット作成
   npx ethers wallet create
   # シードフレーズを安全に保管
   ```

2. **xpub取得**
   ```bash
   # HDウォレットからxpubを取得
   # 実際の実装ではbip32ライブラリを使用
   ```

3. **初期資金投入**
   - テストネット: ファウセット使用
   - メインネット: 実際の資金投入

## 🚀 実装フェーズ別責任分担

### **Phase 1: 基盤構築（Week 1-2）**
**私の作業:**
- Alchemy SDK統合コード
- Privy認証統合コード
- データベーススキーマ更新
- 基本的なAPI設計

**ユーザーの作業:**
- Alchemyアカウント作成・APIキー取得
- Privyアカウント作成・App ID取得
- データベース作成・接続設定
- 環境変数設定

### **Phase 2: 決済フロー（Week 3-4）**
**私の作業:**
- 注文受付API実装
- アドレス生成機能実装
- Privy統合支払い画面実装
- トランザクション処理実装

**ユーザーの作業:**
- マスターウォレット作成・xpub取得
- 初期テスト資金投入
- Alchemy Webhook設定
- Privy認証設定

### **Phase 3: 監視・検知（Week 5-6）**
**私の作業:**
- Alchemy Webhook処理実装
- 入金検知ロジック実装
- 自動確認処理実装
- エラーハンドリング強化

**ユーザーの作業:**
- Webhook URL設定
- 監視アドレス設定
- 通知設定（メール等）
- 本番環境準備

### **Phase 4: 統合・テスト（Week 7-8）**
**私の作業:**
- 全体統合テスト
- セキュリティテスト
- パフォーマンス最適化
- ドキュメント整備

**ユーザーの作業:**
- 本番環境デプロイ
- ドメイン設定
- SSL証明書設定
- 最終テスト実行

## 🔐 セキュリティ責任分担

### **私が実装するセキュリティ:**
- ✅ **コードレベル**: 入力検証、SQLインジェクション対策
- ✅ **APIレベル**: 認証、レート制限、署名検証
- ✅ **データレベル**: 暗号化、サニタイゼーション
- ✅ **ログレベル**: セキュリティログ、監査ログ

### **ユーザーが管理するセキュリティ:**
- ✅ **環境レベル**: 環境変数の安全な管理
- ✅ **インフラレベル**: サーバーセキュリティ、ネットワーク設定
- ✅ **運用レベル**: アクセス制御、監視設定
- ✅ **バックアップ**: データバックアップ、災害復旧

## 📞 サポート範囲

### **私がサポートする:**
- コード実装・デバッグ
- 技術的な問題解決
- 統合エラーの修正
- パフォーマンス最適化
- セキュリティ実装

### **ユーザーが対応する:**
- 外部サービス設定
- 環境構築・設定
- 本番環境デプロイ
- 運用・監視
- カスタマーサポート

## 🎯 成功のポイント

### **重要な設定項目:**
1. **Alchemy Webhook URL**: 正確なURL設定
2. **Privy App ID**: フロントエンド・バックエンド両方
3. **xpub管理**: 安全な保管とバックアップ
4. **環境変数**: 本番・ステージング環境の適切な設定

### **テスト戦略:**
1. **テストネット**: 最初はテストネットで動作確認
2. **段階的テスト**: 各フェーズごとのテスト
3. **統合テスト**: エンドツーエンドのテスト
4. **セキュリティテスト**: ペネトレーションテスト

この分担で実装を進めることで、効率的で安全な仮想通貨決済システムを構築できます。
