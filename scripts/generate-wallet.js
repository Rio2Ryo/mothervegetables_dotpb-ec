const { Wallet } = require('ethers');
const fs = require('fs');
const path = require('path');

console.log('\n' + '='.repeat(60));
console.log('   🔐 仮想通貨決済用マスターウォレット生成ツール');
console.log('='.repeat(60) + '\n');

function generateWallet() {
  try {
    console.log('📝 新しいHDウォレットを生成しています...\n');

    const wallet = Wallet.createRandom();

    console.log('✅ ウォレットが正常に生成されました！\n');
    console.log('-'.repeat(60));

    console.log('\n🔑 ニーモニックフレーズ（シードフレーズ）:');
    console.log('━'.repeat(60));
    console.log(wallet.mnemonic.phrase);
    console.log('━'.repeat(60));

    console.log('\n📬 マスターウォレットアドレス:');
    console.log(wallet.address);

    console.log('\n🔐 秘密鍵:');
    console.log(wallet.privateKey);

    console.log('\n' + '-'.repeat(60));
    console.log('\n⚠️  重要な注意事項:');
    console.log('  1. ニーモニックフレーズは絶対に他人に教えないでください');
    console.log('  2. 安全な場所に保管し、複数のバックアップを作成してください');
    console.log('  3. このフレーズを失うと、資金を永久に失う可能性があります');
    console.log('  4. 本番環境では新しいウォレットを生成してください\n');

    console.log('📋 環境変数設定用（.env.localに追加）:');
    console.log('━'.repeat(60));
    console.log(`MASTER_SEED="${wallet.mnemonic.phrase}"`);
    console.log(`MASTER_ADDRESS="${wallet.address}"`);
    console.log('━'.repeat(60) + '\n');

    // オプション: ファイルに保存（開発環境のみ推奨）
    const saveToFile = process.argv[2] === '--save';
    if (saveToFile) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `wallet-${timestamp}.json`;
      const filepath = path.join(__dirname, filename);

      const walletData = {
        generated_at: new Date().toISOString(),
        network: 'Ethereum',
        mnemonic: wallet.mnemonic.phrase,
        address: wallet.address,
        privateKey: wallet.privateKey,
        warning: 'このファイルには秘密情報が含まれています。安全に保管してください。'
      };

      fs.writeFileSync(filepath, JSON.stringify(walletData, null, 2));
      console.log(`💾 ウォレット情報をファイルに保存しました: ${filename}`);
      console.log('   ⚠️  このファイルは安全な場所に移動し、Gitにコミットしないでください\n');
    } else {
      console.log('💡 ヒント: --save オプションを付けるとファイルに保存できます');
      console.log('   例: node generate-wallet.js --save\n');
    }

    // テストネットワーク情報
    console.log('🌐 テストネットワーク情報:');
    console.log('━'.repeat(60));
    console.log('Sepolia Testnet:');
    console.log('  - Faucet: https://sepoliafaucet.com/');
    console.log('  - Explorer: https://sepolia.etherscan.io/');
    console.log('  - Chain ID: 11155111');
    console.log('\nAlchemy Sepolia Faucet:');
    console.log('  https://www.alchemy.com/faucets/ethereum-sepolia');
    console.log('━'.repeat(60) + '\n');

    console.log('✅ セットアップ手順:');
    console.log('  1. 上記のMASTER_SEEDを.env.localファイルに追加');
    console.log('  2. Alchemy DashboardでAPIキーを取得');
    console.log('  3. Webhook URLを設定');
    console.log('  4. データベースマイグレーションを実行');
    console.log('  5. テスト送金で動作確認\n');

    console.log('='.repeat(60));
    console.log('   セットアップ完了！開発を開始できます 🚀');
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

// 実行
generateWallet();