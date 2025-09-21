const { ethers } = require('ethers')

console.log('🔧 Setting up crypto payment system...\n')

// マスターウォレットを生成
const masterWallet = ethers.Wallet.createRandom()

console.log('📝 Generated Master Wallet:')
console.log(`Address: ${masterWallet.address}`)
console.log(`Private Key: ${masterWallet.privateKey}`)
console.log(`Mnemonic: ${masterWallet.mnemonic.phrase}`)
console.log('')

console.log('🔑 Environment Variables to set:')
console.log('Add these to your .env.local file:')
console.log('')
console.log('# Alchemy API Key (get from https://dashboard.alchemy.com/)')
console.log('NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key_here')
console.log('ALCHEMY_API_KEY=your_alchemy_api_key_here')
console.log('')
console.log('# Master Wallet Private Key (for testing)')
console.log(`MASTER_WALLET_PRIVATE_KEY=${masterWallet.privateKey}`)
console.log('')
console.log('# Network Configuration')
console.log('NEXT_PUBLIC_NETWORK=sepolia')
console.log('NEXT_PUBLIC_CHAIN_ID=11155111')
console.log('')

console.log('⚠️  IMPORTANT SECURITY NOTES:')
console.log('1. This is a TEST wallet - never use in production!')
console.log('2. Fund this wallet with Sepolia ETH from a faucet:')
console.log('   - https://sepoliafaucet.com/')
console.log('   - https://faucet.sepolia.dev/')
console.log('3. In production, use proper key management (AWS KMS, HashiCorp Vault, etc.)')
console.log('')

console.log('🚀 Next Steps:')
console.log('1. Set up your .env.local file with the values above')
console.log('2. Get Alchemy API key from https://dashboard.alchemy.com/')
console.log('3. Fund the master wallet with Sepolia ETH')
console.log('4. Test the crypto payment functionality')
console.log('')

console.log('✅ Setup complete!')
