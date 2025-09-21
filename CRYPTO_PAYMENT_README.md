# 仮想通貨決済機能

このプロジェクトに実装された仮想通貨決済機能の説明です。

## 🚀 機能概要

- **マスターウォレット**: 管理者が管理するメインウォレット
- **子ウォレット生成**: 各注文に対して一意の子ウォレットアドレスを生成
- **支払い監視**: Alchemyを使用してリアルタイムで支払い状況を監視
- **テストネット対応**: Sepoliaテストネットで動作

## 📁 実装ファイル

### コア機能
- `src/lib/alchemy.ts` - Alchemy設定とクライアント
- `src/lib/crypto-payment.ts` - 仮想通貨決済のコアロジック

### API エンドポイント
- `src/app/api/crypto-payment/generate-wallet/route.ts` - 子ウォレット生成
- `src/app/api/crypto-payment/monitor/route.ts` - 支払い監視
- `src/app/api/crypto-payment/balance/route.ts` - 残高確認

### UI コンポーネント
- `src/components/crypto/CryptoPaymentModal.tsx` - 決済モーダル
- `src/app/cart/page.tsx` - カート画面（更新済み）

## 🔧 セットアップ

### 1. 環境変数の設定

`.env.local` ファイルを作成し、以下の値を設定してください：

```env
# Alchemy API Key (https://dashboard.alchemy.com/ で取得)
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here
ALCHEMY_API_KEY=your_alchemy_api_key_here

# マスターウォレットの秘密鍵（テスト用）
MASTER_WALLET_PRIVATE_KEY=0xb102aaffdc5da38101f3565a76fd0400ca07318ad17bb07ad27abdaff20a8f67

# ネットワーク設定
NEXT_PUBLIC_NETWORK=sepolia
NEXT_PUBLIC_CHAIN_ID=11155111
```

### 2. マスターウォレットの資金調達

テスト用のマスターウォレットにSepolia ETHを送金してください：

- **ウォレットアドレス**: `0x8205231d6F851FC4cb8847594e1A27CbaA4cF39E`
- **Sepolia Faucet**: 
  - https://sepoliafaucet.com/
  - https://faucet.sepolia.dev/

### 3. 依存関係のインストール

```bash
npm install
```

## 🎯 使用方法

### 1. カート画面での決済

1. 商品をカートに追加
2. カート画面で「仮想通貨で支払う」ボタンをクリック
3. 決済モーダルが開きます

### 2. 決済プロセス

1. **ウォレット生成**: 注文ごとに一意の子ウォレットアドレスを生成
2. **アドレス表示**: 生成されたアドレスを画面に表示
3. **支払い監視**: リアルタイムで支払い状況を監視
4. **完了通知**: 支払いが確認されると通知

### 3. テスト手順

1. マスターウォレットにSepolia ETHを送金
2. カートに商品を追加
3. 「仮想通貨で支払う」をクリック
4. 生成されたアドレスにSepolia ETHを送金
5. 支払いが自動的に検知されることを確認

## 🔒 セキュリティ考慮事項

### テスト環境
- 現在の実装はテスト用です
- 本番環境では適切な鍵管理システムを使用してください

### 本番環境での推奨事項
- AWS KMS、HashiCorp Vaultなどの鍵管理システムを使用
- マルチシグウォレットの実装
- 監査ログの実装
- レート制限の実装

## 🛠️ 技術仕様

### 使用技術
- **Alchemy SDK**: ブロックチェーンとの通信
- **Ethers.js**: ウォレット管理とトランザクション処理
- **Next.js API Routes**: バックエンドAPI
- **React**: フロントエンドUI

### ネットワーク
- **テストネット**: Sepolia (Chain ID: 11155111)
- **本番ネット**: Ethereum Mainnet (Chain ID: 1)

### ウォレット生成
- **BIP44標準**: 階層的決定論的ウォレット
- **導出パス**: `m/44'/60'/0'/0/{index}`
- **最大子ウォレット数**: 1000

## 📊 監視機能

### 支払い監視
- **監視間隔**: 10秒
- **監視方法**: AlchemyのAsset Transfers API
- **検知条件**: 残高が期待金額以上

### ログ出力
- ウォレット生成ログ
- 支払い監視ログ
- エラーログ

## 🚨 トラブルシューティング

### よくある問題

1. **Alchemy API エラー**
   - API キーが正しく設定されているか確認
   - ネットワーク設定が正しいか確認

2. **ウォレット生成エラー**
   - マスターウォレットの秘密鍵が正しいか確認
   - 環境変数が正しく設定されているか確認

3. **支払い監視エラー**
   - ネットワーク接続を確認
   - Alchemy API の制限に達していないか確認

### デバッグ方法

```bash
# 開発サーバーを起動
npm run dev

# ブラウザの開発者ツールでコンソールログを確認
# ネットワークタブでAPI呼び出しを確認
```

## 📈 今後の拡張予定

- [ ] 複数の仮想通貨対応（USDC、USDT等）
- [ ] スマートコントラクトによる自動決済
- [ ] マルチシグウォレット対応
- [ ] 支払い履歴の永続化
- [ ] メール通知機能
- [ ] 管理者ダッシュボード

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. 環境変数の設定
2. ネットワーク接続
3. Alchemy API の制限
4. ブラウザのコンソールログ

---

**注意**: この実装は技術検証用です。本番環境での使用前に、セキュリティ監査とテストを実施してください。
