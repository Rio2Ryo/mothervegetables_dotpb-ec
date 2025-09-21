# 仮想通貨決済システム 完全ガイド

## 🏗️ システムアーキテクチャ

### 全体の流れ

```mermaid
graph TD
    A[顧客が商品購入] --> B[仮想通貨支払い選択]
    B --> C[注文作成API呼び出し]
    C --> D[一意のアドレス生成]
    D --> E[QRコード/アドレス表示]
    E --> F[顧客が送金]
    F --> G{入金検知方法}
    G -->|Webhook| H[Alchemy Webhook受信]
    G -->|Polling| I[定期監視]
    H --> J[支払い確認]
    I --> J
    J --> K[注文ステータス更新]
    K --> L[商品発送]
```

## 📁 実装したファイル詳細

### 1. ウォレット管理 (`src/lib/crypto/wallet.ts`)

**機能：**
- HDウォレットを使用した決定論的アドレス生成
- 注文IDからユニークなアドレスを導出
- BIP44標準に準拠

**重要なメソッド：**
```typescript
generateAddressForOrder(orderId: string): {
  address: string;     // 受取アドレス
  privateKey: string;  // 秘密鍵（資金移動用）
  path: string;        // 導出パス
}
```

**セキュリティ：**
- マスターシードは環境変数に保存
- 各注文に異なるアドレスを生成（プライバシー保護）
- 秘密鍵は暗号化して保存（実装予定）

### 2. Alchemy連携 (`src/lib/crypto/alchemy.ts`)

**主要機能：**
- 残高確認
- トランザクション履歴取得
- リアルタイム監視
- トランザクション検証

**APIメソッド：**
```typescript
// 残高確認
getBalance(address: string): Promise<string>

// 送金履歴取得
getTransactionHistory(address: string): Promise<Transfer[]>

// トランザクション検証
verifyTransaction(txHash, expectedAddress, expectedAmount): Promise<VerificationResult>

// アドレス監視（WebSocket）
subscribeToAddress(address: string, callback: Function): Promise<void>
```

### 3. アドレス生成API (`/api/crypto/generate-address`)

**エンドポイント：** `POST /api/crypto/generate-address`

**リクエスト：**
```json
{
  "orderId": "ORDER_123",
  "amount": "0.001",      // ETH単位
  "currency": "ETH"
}
```

**レスポンス：**
```json
{
  "success": true,
  "data": {
    "address": "0x1234...",
    "amount": "0.001",
    "currency": "ETH",
    "orderId": "ORDER_123",
    "expiresAt": "2024-01-01T12:30:00Z",
    "paymentId": "pay_xxx"
  }
}
```

**処理フロー：**
1. 注文IDの検証
2. HDウォレットから新規アドレス生成
3. データベースに支払い情報保存
4. 30分の有効期限設定
5. アドレス情報返却

### 4. Webhook処理 (`/api/crypto/webhook/alchemy`)

**エンドポイント：** `POST /api/crypto/webhook/alchemy`

**Alchemyから送信されるデータ：**
```json
{
  "webhookId": "wh_xxx",
  "type": "ADDRESS_ACTIVITY",
  "event": {
    "network": "ETH_MAINNET",
    "activity": [{
      "fromAddress": "0xabc...",
      "toAddress": "0x123...",
      "value": 0.001,
      "asset": "ETH",
      "hash": "0xtx...",
      "blockNum": "18000000"
    }]
  }
}
```

**処理内容：**
1. 署名検証（HMAC-SHA256）
2. 受取アドレスとDB照合
3. 金額検証
4. ステータス更新
5. Shopify注文更新（TODO）

### 5. 支払いステータス確認 (`/api/crypto/payment-status`)

**エンドポイント：** `GET /api/crypto/payment-status?orderId=xxx`

**レスポンス例：**
```json
{
  "success": true,
  "data": {
    "paymentId": "pay_xxx",
    "orderId": "ORDER_123",
    "address": "0x123...",
    "amount": "1000000000000000",  // Wei単位
    "currency": "ETH",
    "status": "PENDING",  // PENDING | CONFIRMED | EXPIRED | INSUFFICIENT
    "balance": "0",
    "transactionHash": null,
    "expiresAt": "2024-01-01T12:30:00Z",
    "isExpired": false
  }
}
```

### 6. 支払い監視システム (`src/lib/crypto/payment-monitor.ts`)

**用途：** Webhookのバックアップ、定期的な支払い確認

**機能：**
- 10秒間隔でアドレス残高確認
- トランザクション履歴チェック
- 期限切れ処理
- 自動停止機能

## 🔧 セットアップ手順（詳細版）

### ステップ1: Alchemy設定

#### 1.1 アカウント作成
1. https://dashboard.alchemy.com/ にアクセス
2. 「Sign Up」でアカウント作成
3. メール認証を完了

#### 1.2 アプリ作成
1. Dashboard → 「+ Create new app」
2. 設定：
   - **Name**: Your App Name
   - **Description**: 任意
   - **Chain**: Ethereum
   - **Network**: Sepolia（テスト）またはMainnet（本番）

#### 1.3 APIキー取得
1. 作成したアプリをクリック
2. 「API Key」タブ
3. 「View Key」でAPIキーを表示
4. コピーして`.env.local`に追加：
```env
ALCHEMY_API_KEY=your_api_key_here
```

#### 1.4 Webhook設定
1. Dashboard → 「Webhooks」タブ
2. 「Create Webhook」クリック
3. 設定入力：
   ```
   Webhook URL: https://yourdomain.com/api/crypto/webhook/alchemy
   Type: Address Activity
   Network: Sepolia or Mainnet
   ```
4. 「Create Webhook」実行
5. 作成後、「Signing Key」をコピー
6. `.env.local`に追加：
```env
ALCHEMY_WEBHOOK_SECRET=your_signing_key_here
```

### ステップ2: マスターウォレット作成

#### 2.1 ウォレット生成スクリプト作成
```javascript
// generate-wallet.js
const { Wallet } = require('ethers');

console.log('========================================');
console.log('新しいマスターウォレットを生成します...');
console.log('========================================\n');

const wallet = Wallet.createRandom();

console.log('📝 ニーモニックフレーズ（12単語）:');
console.log('----------------------------------------');
console.log(wallet.mnemonic.phrase);
console.log('----------------------------------------');
console.log('⚠️  上記のフレーズを安全に保管してください！');
console.log('⚠️  このフレーズは二度と表示されません！\n');

console.log('📬 ウォレットアドレス:');
console.log(wallet.address);
console.log('\n========================================');
```

#### 2.2 実行
```bash
node generate-wallet.js
```

#### 2.3 環境変数設定
```env
MASTER_SEED=生成された12単語のフレーズをスペース区切りで入力
NETWORK=sepolia  # または mainnet
```

### ステップ3: データベース設定

#### 3.1 PostgreSQL準備
```bash
# Dockerを使用する場合
docker run -d \
  --name crypto-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -e POSTGRES_DB=cryptopayments \
  -p 5432:5432 \
  postgres:14
```

#### 3.2 接続URL設定
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/cryptopayments"
```

#### 3.3 Prismaマイグレーション
```bash
# Prismaクライアント生成
npx prisma generate

# データベーススキーマ適用
npx prisma db push

# マイグレーション作成（本番用）
npx prisma migrate dev --name add-crypto-payments
```

### ステップ4: テスト環境準備

#### 4.1 Sepoliaテストネット用ETH取得

**方法1: Alchemy Faucet**
1. https://www.alchemy.com/faucets/ethereum-sepolia
2. Alchemyアカウントでログイン
3. マスターウォレットアドレス入力
4. 「Send ETH」クリック

**方法2: その他のFaucet**
- https://sepoliafaucet.com/
- https://faucet.quicknode.com/ethereum/sepolia

#### 4.2 送金テスト用ウォレット準備
MetaMaskなどで別のテストウォレット作成

## 🧪 テスト方法

### 1. ローカル動作確認

#### 1.1 開発サーバー起動
```bash
npm run dev
```

#### 1.2 アドレス生成テスト
```bash
# PowerShellの場合
$body = @{
    orderId = "TEST_001"
    amount = "0.001"
    currency = "ETH"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/crypto/generate-address" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body

# Bashの場合
curl -X POST http://localhost:3000/api/crypto/generate-address \
  -H "Content-Type: application/json" \
  -d '{"orderId":"TEST_001","amount":"0.001","currency":"ETH"}'
```

#### 1.3 ステータス確認
```bash
# PowerShell
Invoke-RestMethod -Uri "http://localhost:3000/api/crypto/payment-status?orderId=TEST_001"

# Bash
curl http://localhost:3000/api/crypto/payment-status?orderId=TEST_001
```

### 2. Webhook動作確認

#### 2.1 ngrokでローカル公開
```bash
# ngrokインストール
npm install -g ngrok

# ローカルサーバー公開
ngrok http 3000
```

#### 2.2 Alchemy Webhook URL更新
```
https://your-ngrok-url.ngrok.io/api/crypto/webhook/alchemy
```

#### 2.3 テスト送金実行
MetaMaskから生成されたアドレスに送金

## 🎨 フロントエンド実装例

### 支払い画面コンポーネント
```typescript
// components/CryptoPayment.tsx
import { useState, useEffect } from 'react'
import QRCode from 'qrcode.react'

export default function CryptoPayment({ orderId, amount }) {
  const [paymentData, setPaymentData] = useState(null)
  const [status, setStatus] = useState('LOADING')

  useEffect(() => {
    generateAddress()
    const interval = setInterval(checkStatus, 10000)
    return () => clearInterval(interval)
  }, [orderId])

  const generateAddress = async () => {
    const res = await fetch('/api/crypto/generate-address', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId, amount, currency: 'ETH' })
    })
    const data = await res.json()
    setPaymentData(data.data)
    setStatus('PENDING')
  }

  const checkStatus = async () => {
    const res = await fetch(`/api/crypto/payment-status?orderId=${orderId}`)
    const data = await res.json()
    setStatus(data.data.status)
  }

  if (!paymentData) return <div>Loading...</div>

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2>仮想通貨でお支払い</h2>

      {status === 'CONFIRMED' ? (
        <div className="text-green-600">
          ✅ 支払いが確認されました！
        </div>
      ) : (
        <>
          <QRCode value={`ethereum:${paymentData.address}?value=${amount}`} />

          <div className="mt-4">
            <p>送金先アドレス:</p>
            <code className="break-all">{paymentData.address}</code>
          </div>

          <div className="mt-2">
            <p>送金額: {amount} ETH</p>
            <p>期限: {new Date(paymentData.expiresAt).toLocaleString()}</p>
          </div>

          <div className="mt-4">
            ステータス: {status}
          </div>
        </>
      )}
    </div>
  )
}
```

## ⚠️ セキュリティ注意事項

### 必須対策
1. **環境変数の管理**
   - `.env.local`を絶対にGitにコミットしない
   - 本番環境では環境変数管理サービス使用

2. **Webhook署名検証**
   - 必ず署名を検証してから処理
   - タイミング攻撃対策済み

3. **レート制限**
   - API呼び出しに制限を設ける
   - DDoS攻撃対策

4. **監査ログ**
   - すべての支払い処理をログに記録
   - 異常検知システム構築

## 🚀 本番環境デプロイ

### Vercelへのデプロイ
```bash
# 環境変数設定
vercel env add ALCHEMY_API_KEY
vercel env add ALCHEMY_WEBHOOK_SECRET
vercel env add MASTER_SEED
vercel env add DATABASE_URL
vercel env add NETWORK

# デプロイ
vercel --prod
```

## 📊 監視とメンテナンス

### 監視項目
- Webhook受信率
- 支払い成功率
- アドレス生成エラー率
- 平均処理時間

### 定期メンテナンス
- 期限切れ支払いレコードのクリーンアップ
- ウォレット残高の定期確認
- ログファイルのローテーション

## 🆘 トラブルシューティング

### よくある問題と解決策

**Q: Webhookが届かない**
A:
- Alchemy DashboardでWebhook URLを確認
- ngrokでローカルテスト
- ファイアウォール設定確認

**Q: アドレス生成でエラー**
A:
- MASTER_SEEDが正しいか確認
- Prismaクライアント再生成: `npx prisma generate`

**Q: 支払いが検知されない**
A:
- ネットワーク設定確認（Sepolia/Mainnet）
- Alchemyの残高確認API直接実行
- PaymentMonitorが動作しているか確認

## 📚 参考資料

- [Alchemy公式ドキュメント](https://docs.alchemy.com/)
- [Ethereum開発ガイド](https://ethereum.org/developers/)
- [HDウォレット仕様(BIP44)](https://github.com/bitcoin/bips/blob/master/bip-0044.mediawiki)
- [Web3セキュリティベストプラクティス](https://consensys.github.io/smart-contract-best-practices/)