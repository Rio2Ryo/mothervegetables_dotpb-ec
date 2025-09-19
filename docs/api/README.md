# API仕様

## 🌐 概要

API仕様書と設定手順を格納するフォルダです。

## 📄 ドキュメント一覧

### **設定手順**
- [Shopify Checkout言語設定](./SHOPIFY_CHECKOUT_LANGUAGE_SETUP.md)
  - チェックアウト画面の多言語対応設定
  - Shopify Adminでの設定手順
  - トラブルシューティング

## 🔧 API設計

### **エンドポイント構成**

#### **認証関連**
```
POST /api/auth/sync-customer
POST /api/auth/create-customer
```

#### **決済関連**
```
POST /api/crypto/generate-address
POST /api/orders/crypto
PUT  /api/orders/[orderId]
```

#### **Webhook**
```
POST /api/crypto/webhook/alchemy
POST /api/shopify/webhook/orders
```

#### **Shopify統合**
```
GET  /api/shopify/products
GET  /api/shopify/collections
POST /api/shopify/cart
```

## 📋 API仕様

### **認証API**

#### **カスタマー同期**
```typescript
POST /api/auth/sync-customer
Content-Type: application/json

{
  "privyUserId": "string",
  "email": "string",
  "walletAddress": "string"
}

Response:
{
  "shopifyCustomerId": "string",
  "customer": "object",
  "isNew": "boolean"
}
```

#### **カスタマー作成**
```typescript
POST /api/auth/create-customer
Content-Type: application/json

{
  "privyUserId": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string"
}

Response:
{
  "customer": "object",
  "userLink": "object"
}
```

### **決済API**

#### **アドレス生成**
```typescript
POST /api/crypto/generate-address
Content-Type: application/json

{
  "orderId": "string"
}

Response:
{
  "address": "string",
  "amount": "number",
  "currency": "string",
  "expiresAt": "string",
  "qrCode": "string"
}
```

#### **仮想通貨注文作成**
```typescript
POST /api/orders/crypto
Content-Type: application/json

{
  "userLinkId": "string",
  "shopifyCustomerId": "string",
  "walletAddress": "string",
  "items": "array",
  "paymentMethod": "crypto"
}

Response:
{
  "orderId": "string",
  "paymentAddress": "string",
  "status": "string"
}
```

### **Webhook API**

#### **Alchemy入金検知**
```typescript
POST /api/crypto/webhook/alchemy
Content-Type: application/json
X-Alchemy-Signature: "string"

{
  "activity": [
    {
      "toAddress": "string",
      "value": "string",
      "hash": "string",
      "blockNum": "number"
    }
  ]
}

Response:
{
  "success": "boolean"
}
```

## 🔐 セキュリティ

### **認証・認可**
- JWT Token認証
- API Key認証
- Webhook署名検証

### **レート制限**
- IP制限
- リクエスト頻度制限
- エンドポイント別制限

### **入力検証**
- リクエストデータ検証
- SQLインジェクション対策
- XSS対策

## 📊 レスポンス形式

### **成功レスポンス**
```typescript
{
  "success": true,
  "data": "object",
  "message": "string"
}
```

### **エラーレスポンス**
```typescript
{
  "success": false,
  "error": {
    "code": "string",
    "message": "string",
    "details": "object"
  }
}
```

### **ステータスコード**
- `200`: 成功
- `201`: 作成成功
- `400`: リクエストエラー
- `401`: 認証エラー
- `403`: 認可エラー
- `404`: リソース未発見
- `500`: サーバーエラー

## 🧪 テスト

### **API テスト**
- 単体テスト (Jest)
- 統合テスト (Supertest)
- E2Eテスト (Playwright)

### **テストデータ**
- モックデータ
- テスト環境設定
- テストケース設計

---

**最終更新**: 2024年9月20日
