# 仮想通貨決済システム テストシナリオ集

## 🧪 テスト環境準備

### 前提条件
- Node.js環境構築済み
- PostgreSQLデータベース起動済み
- Alchemyアカウント作成済み
- Sepoliaテストネット用ETH保有

## 📝 テストシナリオ

### シナリオ1: 基本的な支払いフロー

#### 1.1 マスターウォレット生成
```bash
# ウォレット生成
node scripts/generate-wallet.js

# ファイル保存する場合
node scripts/generate-wallet.js --save
```

#### 1.2 環境変数設定確認
`.env.local`に以下が設定されているか確認：
```env
MASTER_SEED="生成された12単語"
ALCHEMY_API_KEY="Alchemyのキー"
ALCHEMY_WEBHOOK_SECRET="Webhookシークレット"
NETWORK="sepolia"
DATABASE_URL="postgresql://..."
```

#### 1.3 データベース初期化
```bash
# Prismaクライアント生成
npx prisma generate

# スキーマ適用
npx prisma db push

# データ確認（オプション）
npx prisma studio
```

#### 1.4 開発サーバー起動
```bash
npm run dev
```

### シナリオ2: アドレス生成テスト

#### 2.1 正常系: アドレス生成
```powershell
# PowerShell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/crypto/generate-address" `
    -Method Post `
    -ContentType "application/json" `
    -Body (@{
        orderId = "ORDER_TEST_001"
        amount = "0.001"
        currency = "ETH"
    } | ConvertTo-Json)

Write-Host "生成されたアドレス: $($response.data.address)"
Write-Host "支払いID: $($response.data.paymentId)"
```

#### 2.2 異常系: 必須パラメータ不足
```bash
# orderIdなしでリクエスト
curl -X POST http://localhost:3000/api/crypto/generate-address \
  -H "Content-Type: application/json" \
  -d '{"amount":"0.001"}'

# 期待結果: 400 Bad Request
```

#### 2.3 重複注文チェック
```bash
# 同じorderIdで2回リクエスト
curl -X POST http://localhost:3000/api/crypto/generate-address \
  -H "Content-Type: application/json" \
  -d '{"orderId":"DUP_001","amount":"0.001","currency":"ETH"}'

# 2回目も実行
curl -X POST http://localhost:3000/api/crypto/generate-address \
  -H "Content-Type: application/json" \
  -d '{"orderId":"DUP_001","amount":"0.001","currency":"ETH"}'

# 期待結果: 異なるアドレスが生成される
```

### シナリオ3: 支払いステータス確認

#### 3.1 正常系: ステータス取得
```bash
# orderIdで検索
curl "http://localhost:3000/api/crypto/payment-status?orderId=ORDER_TEST_001"

# paymentIdで検索
curl "http://localhost:3000/api/crypto/payment-status?paymentId=pay_xxx"
```

#### 3.2 期限切れチェック
```javascript
// 30分後に自動的にEXPIREDになるか確認
// scripts/test-expiry.js
const checkExpiry = async () => {
  const orderId = "EXPIRY_TEST_001";

  // アドレス生成
  const res1 = await fetch('http://localhost:3000/api/crypto/generate-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderId, amount: '0.001', currency: 'ETH' })
  });

  console.log('初期状態:', await res1.json());

  // 31分後にチェック（実際のテストでは時間を調整）
  setTimeout(async () => {
    const res2 = await fetch(`http://localhost:3000/api/crypto/payment-status?orderId=${orderId}`);
    const data = await res2.json();
    console.log('31分後のステータス:', data.data.status); // EXPIRED期待
  }, 31 * 60 * 1000);
};

checkExpiry();
```

### シナリオ4: Webhook受信テスト

#### 4.1 ngrokでローカル公開
```bash
# ngrokインストール（初回のみ）
npm install -g ngrok

# ローカルサーバー公開
ngrok http 3000

# 表示されたURL（例: https://abc123.ngrok.io）をメモ
```

#### 4.2 Alchemyダッシュボード設定
1. Alchemy Dashboard → Webhooks
2. Webhook URL更新: `https://abc123.ngrok.io/api/crypto/webhook/alchemy`
3. Test Webhookで送信テスト

#### 4.3 Webhook署名検証テスト
```javascript
// scripts/test-webhook.js
const crypto = require('crypto');

const testWebhook = async () => {
  const secret = process.env.ALCHEMY_WEBHOOK_SECRET;
  const payload = {
    webhookId: "test",
    type: "ADDRESS_ACTIVITY",
    event: {
      network: "ETH_SEPOLIA",
      activity: [{
        fromAddress: "0x123...",
        toAddress: "0x456...",  // 生成したアドレス
        value: 0.001,
        asset: "ETH",
        hash: "0xtx123...",
        blockNum: "4500000"
      }]
    }
  };

  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret)
    .update(body)
    .digest('hex');

  const response = await fetch('http://localhost:3000/api/crypto/webhook/alchemy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-alchemy-signature': signature
    },
    body: body
  });

  console.log('Webhook response:', await response.json());
};

testWebhook();
```

### シナリオ5: 実際の送金テスト（Sepolia）

#### 5.1 テストETH準備
```javascript
// 1. Sepoliaファウセットから取得
// https://sepoliafaucet.com/

// 2. 送金用ウォレット準備（MetaMask等）
```

#### 5.2 送金実行
```javascript
// scripts/test-payment.js
const { ethers } = require('ethers');

async function testPayment() {
  // 1. 支払いアドレス生成
  const orderResponse = await fetch('http://localhost:3000/api/crypto/generate-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      orderId: 'REAL_TEST_001',
      amount: '0.0001',  // 少額でテスト
      currency: 'ETH'
    })
  });

  const { data } = await orderResponse.json();
  console.log('Payment Address:', data.address);
  console.log('Amount:', data.amount, 'ETH');

  // 2. MetaMaskで手動送金、または以下のコードで自動送金
  const provider = new ethers.JsonRpcProvider('https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY');
  const wallet = new ethers.Wallet('YOUR_TEST_WALLET_PRIVATE_KEY', provider);

  const tx = await wallet.sendTransaction({
    to: data.address,
    value: ethers.parseEther(data.amount)
  });

  console.log('Transaction Hash:', tx.hash);
  console.log('Waiting for confirmation...');

  await tx.wait();
  console.log('Transaction confirmed!');

  // 3. ステータス確認
  setTimeout(async () => {
    const statusResponse = await fetch(`http://localhost:3000/api/crypto/payment-status?orderId=REAL_TEST_001`);
    const statusData = await statusResponse.json();
    console.log('Payment Status:', statusData.data.status);
  }, 5000);
}

testPayment().catch(console.error);
```

### シナリオ6: 監視システムテスト

#### 6.1 PaymentMonitor動作確認
```javascript
// scripts/test-monitor.js
const { PaymentMonitor } = require('../src/lib/crypto/payment-monitor');

async function testMonitor() {
  const monitor = new PaymentMonitor(
    process.env.ALCHEMY_API_KEY,
    'ETH_SEPOLIA'
  );

  // 支払いを監視開始
  const paymentId = 'pay_xxx'; // 実際のpaymentId
  await monitor.startMonitoring(paymentId, 5000); // 5秒間隔

  // 30秒後に停止
  setTimeout(() => {
    monitor.stopMonitoring(paymentId);
    console.log('Monitoring stopped');
  }, 30000);
}

testMonitor();
```

### シナリオ7: エラーハンドリング

#### 7.1 ネットワークエラー
```bash
# Alchemyへの接続を切断した状態でテスト
# 期待動作: エラーログ出力、フォールバック処理
```

#### 7.2 データベースエラー
```bash
# データベース停止状態でテスト
docker stop crypto-postgres

# リクエスト送信
curl -X POST http://localhost:3000/api/crypto/generate-address \
  -H "Content-Type: application/json" \
  -d '{"orderId":"DB_ERROR_TEST","amount":"0.001"}'

# 期待結果: 500エラー、適切なエラーメッセージ
```

### シナリオ8: パフォーマンステスト

#### 8.1 同時リクエスト処理
```javascript
// scripts/load-test.js
async function loadTest() {
  const promises = [];

  for (let i = 0; i < 100; i++) {
    promises.push(
      fetch('http://localhost:3000/api/crypto/generate-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: `LOAD_TEST_${i}`,
          amount: '0.001',
          currency: 'ETH'
        })
      })
    );
  }

  console.time('100 requests');
  const results = await Promise.all(promises);
  console.timeEnd('100 requests');

  const successful = results.filter(r => r.ok).length;
  console.log(`Success: ${successful}/100`);
}

loadTest();
```

## 🔍 デバッグツール

### Prisma Studio
```bash
# データベースGUI表示
npx prisma studio
```

### ログ監視
```javascript
// 詳細ログを有効化
export DEBUG=alchemy:*
npm run dev
```

### Etherscan確認
```bash
# Sepolia Etherscan
https://sepolia.etherscan.io/address/[YOUR_ADDRESS]
```

## ✅ チェックリスト

### 初期設定
- [ ] マスターウォレット生成完了
- [ ] 環境変数設定完了
- [ ] データベース接続確認
- [ ] Alchemyアカウント設定完了
- [ ] Webhook URL設定完了

### 機能テスト
- [ ] アドレス生成成功
- [ ] 支払いステータス取得成功
- [ ] Webhook受信成功
- [ ] 実際の送金で支払い確認
- [ ] 期限切れ処理動作確認

### セキュリティ
- [ ] Webhook署名検証動作
- [ ] 環境変数が.gitignoreに含まれている
- [ ] エラー時に秘密情報が漏れない

### パフォーマンス
- [ ] 100件同時リクエスト処理可能
- [ ] メモリリークなし
- [ ] 応答時間1秒以内

## 🚨 よくある問題と解決策

### Q: Webhookが届かない
A:
- ngrok URLが正しいか確認
- Alchemy DashboardでWebhook設定確認
- ファイアウォール設定確認

### Q: アドレス生成エラー
A:
- MASTER_SEEDが正しいか確認
- データベース接続確認
- Prismaクライアント再生成

### Q: 支払いが検知されない
A:
- ネットワーク設定確認（Sepolia/Mainnet）
- 金額が正確か確認（Wei単位の変換）
- Alchemyの残高APIで直接確認

### Q: トランザクションが遅い
A:
- ガス価格を確認
- ネットワーク混雑状況確認
- ブロック確認数の調整を検討