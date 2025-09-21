# 仮想通貨決済システム セットアップガイド

## 📋 必要な作業一覧

### 1. Alchemyアカウント設定

1. **アカウント作成**
   - https://dashboard.alchemy.com/ でアカウント作成
   - 新しいアプリを作成（Ethereum選択）

2. **APIキー取得**
   - Dashboard → Your Apps → API Key をコピー
   - `.env.local` に `ALCHEMY_API_KEY=your_key_here` を追加

3. **Webhook設定**
   - Dashboard → Webhooks → Create Webhook
   - **Webhook URL**: `https://yourdomain.com/api/crypto/webhook/alchemy`
   - **Type**: Address Activity
   - **Network**: Sepolia（テスト）またはMainnet（本番）
   - 作成後、Signing Keyをコピー
   - `.env.local` に `ALCHEMY_WEBHOOK_SECRET=your_signing_key` を追加

### 2. ウォレット設定

1. **マスターウォレット作成**
   ```bash
   # Node.jsコンソールで実行
   const { Wallet } = require('ethers')
   const wallet = Wallet.createRandom()
   console.log('Mnemonic:', wallet.mnemonic.phrase)
   console.log('Address:', wallet.address)
   ```

2. **環境変数設定**
   `.env.local` に追加：
   ```
   MASTER_SEED=your_12_word_mnemonic_phrase_here
   NETWORK=sepolia  # テスト用。本番は mainnet
   ```

3. **重要な注意事項**
   - マスターシードは安全に保管してください
   - 本番環境では絶対に公開しないでください
   - バックアップを必ず取ってください

### 3. データベース設定

1. **Prismaマイグレーション実行**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

2. **データベースURL確認**
   `.env.local` に `DATABASE_URL` が設定されていることを確認

### 4. テスト用ETH取得（Sepoliaの場合）

1. **Sepoliaファウセット**
   - https://sepoliafaucet.com/
   - https://www.alchemy.com/faucets/ethereum-sepolia
   - マスターウォレットのアドレスにテストETHを取得

### 5. 動作確認

1. **アドレス生成テスト**
   ```bash
   curl -X POST http://localhost:3000/api/crypto/generate-address \
     -H "Content-Type: application/json" \
     -d '{"orderId": "test001", "amount": "0.001", "currency": "ETH"}'
   ```

2. **支払いステータス確認**
   ```bash
   curl http://localhost:3000/api/crypto/payment-status?orderId=test001
   ```

## 🔐 セキュリティチェックリスト

- [ ] マスターシードは環境変数に設定済み
- [ ] `.env.local` は `.gitignore` に含まれている
- [ ] Webhook署名検証が有効
- [ ] HTTPSを使用（本番環境）
- [ ] レート制限の実装を検討

## 🚨 トラブルシューティング

### Webhookが届かない場合
- Alchemy DashboardでWebhook URLが正しいか確認
- ファイアウォールがWebhookをブロックしていないか確認
- 手動監視システム（PaymentMonitor）が代替として機能します

### アドレス生成エラー
- `MASTER_SEED` が正しく設定されているか確認
- 12〜24単語のニーモニックフレーズである必要があります

### 支払いが検知されない
- Alchemyのネットワーク設定が正しいか確認
- 監視アドレスがWebhookに登録されているか確認

## 📞 サポート

問題が発生した場合は、以下を確認してください：
1. 環境変数がすべて正しく設定されているか
2. データベースが正しく接続されているか
3. Alchemyの設定が完了しているか

## 🎯 次のステップ

1. フロントエンドの支払い画面を実装
2. QRコード表示機能を追加
3. 支払い確認後のShopify注文更新を実装
4. メール通知システムの追加