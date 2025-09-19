# Shopify Checkout画面の言語設定ガイド

## 🎯 問題
ShopifyのCheckout画面が英語になっていない問題を解決する方法を説明します。

## 📋 解決方法

### **1. Shopify Adminでの言語設定**

#### **Step 1: チェックアウト言語の設定**
1. **Shopify Admin** にログイン: `https://gfzqyh-gw.myshopify.com/admin`
2. **「設定」** → **「チェックアウト」** に移動
3. **「言語」** セクションを探す
4. **「チェックアウト言語」** を **「英語」** に設定
5. **「保存」** をクリック

#### **Step 2: ストアの言語設定**
1. **「設定」** → **「一般」** に移動
2. **「ストアの詳細」** セクションで **「言語」** を確認
3. **「英語」** が選択されているか確認

#### **Step 3: チェックアウト設定の確認**
1. **「オンラインストア」** → **「テーマ」** → **「カスタマイズ」**
2. **「チェックアウト」** セクションを確認
3. **「言語設定」** で英語が選択されているか確認

### **2. アプリケーション側の設定**

#### **実装済みの機能**
- ✅ Checkout URLに言語パラメータを自動追加
- ✅ 現在の言語設定に基づいて `locale=en` または `locale=ja` を設定
- ✅ 英語選択時: `?locale=en&language=en`
- ✅ 日本語選択時: `?locale=ja&language=ja`

#### **URL例**
```
英語: https://checkout.shopify.com/...?locale=en&language=en
日本語: https://checkout.shopify.com/...?locale=ja&language=ja
```

### **3. 追加の設定オプション**

#### **Shopify Plus の場合**
1. **「チェックアウト」** → **「カスタマイズ」**
2. **「言語」** セクションで詳細設定
3. **「多言語対応」** を有効化

#### **Shopify Scripts を使用する場合**
```liquid
{% if checkout.locale == 'en' %}
  <!-- 英語コンテンツ -->
{% else %}
  <!-- 日本語コンテンツ -->
{% endif %}
```

### **4. 確認方法**

#### **テスト手順**
1. **アプリケーションで言語を英語に切り替え**
2. **商品をカートに追加**
3. **「チェックアウト」ボタンをクリック**
4. **URLに `locale=en` が含まれているか確認**
5. **Shopify Checkout画面が英語で表示されるか確認**

#### **トラブルシューティング**
- **URLパラメータが反映されない場合**: Shopify Adminの設定を確認
- **言語が切り替わらない場合**: ブラウザのキャッシュをクリア
- **エラーが発生する場合**: ストアの言語設定を確認

### **5. 高度な設定**

#### **カスタムドメインを使用する場合**
```javascript
// チェックアウトURLの生成
const generateCheckoutUrl = (cartId, language) => {
  const baseUrl = `https://checkout.shopify.com/carts/${cartId}`
  return `${baseUrl}?locale=${language}&language=${language}`
}
```

#### **地域別言語設定**
```javascript
// 地域に基づく言語自動検出
const detectLanguageFromRegion = (region) => {
  const languageMap = {
    'US': 'en',
    'CA': 'en',
    'GB': 'en',
    'JP': 'ja',
    'AU': 'en'
  }
  return languageMap[region] || 'en'
}
```

## ✅ 設定完了後の確認項目

- [ ] Shopify Adminでチェックアウト言語が英語に設定されている
- [ ] ストアの言語設定が適切に設定されている
- [ ] アプリケーションから送信されるURLに言語パラメータが含まれている
- [ ] Checkout画面が英語で表示される
- [ ] エラーメッセージが適切な言語で表示される

## 🔧 サポート

設定で問題が発生した場合は、以下を確認してください：
1. Shopify Adminの権限設定
2. ストアのプラン（一部の機能はPlusプランが必要）
3. テーマの互換性
4. ブラウザの言語設定
