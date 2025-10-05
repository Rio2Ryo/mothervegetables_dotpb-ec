# ECサイト機能の抜け漏れレポート

**調査日**: 2025-10-05
**対象プロジェクト**: MOTHER VEGETABLES EC Platform

---

## ✅ 実装済みの機能

### 1. カート機能
- ✅ Shopify カート同期（リトライ機能付き：最大3回、指数バックオフ）
- ✅ ローカルストレージ永続化
- ✅ デバウンス処理（500ms）
- ✅ 在庫状況の表示
- ✅ 数量変更機能
- ✅ カートアイテム削除

### 2. 認証機能
- ✅ フォームバリデーション（Zod使用）
- ✅ パスワード表示/非表示トグル
- ✅ エラーメッセージ表示
- ✅ ローディング状態の管理
- ✅ Google OAuth連携
- ✅ MetaMask認証

### 3. 支払い機能
- ✅ MetaMaskキャンセルハンドリング（code: 4001検出）
- ✅ クレジットカード決済（Shopify Checkout）
- ✅ 仮想通貨決済（Ethereum/Sepolia）
- ✅ ドラフト注文の自動完了
- ✅ トランザクション追跡

### 4. ユーザーフィードバック
- ✅ Toastシステム（success/error/info）
- ✅ カート追加成功通知
- ✅ ローディングスピナー
- ✅ エラーメッセージ表示（Alert）

### 5. エラーハンドリング
- ✅ API エラーハンドリング（HTTP ステータスコード）
- ✅ GraphQL エラーハンドリング
- ✅ Shopify 同期エラーリトライ
- ✅ MetaMask ユーザーキャンセル検出

---

## ❌ 抜け漏れ機能（優先度別）

### 🔴 高優先度（必須実装）

#### 1. **React Error Boundary の実装**
**現状**: 未実装
**問題**: コンポーネントエラーでアプリ全体がクラッシュ
**推奨対策**:
```typescript
// src/components/ErrorBoundary.tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // エラーログ記録
    // ユーザーにフレンドリーなエラー画面を表示
  }
}
```

#### 2. **カート追加失敗時のToast表示**
**現状**: `ProductCards.tsx:74-76` でエラーをconsole.errorのみ
**問題**: ユーザーがエラーに気づかない
**推奨対策**:
```typescript
// src/components/ProductCards.tsx:74
} catch (error) {
  console.error('カート追加エラー:', error)
  showError(t({
    JP: 'カートへの追加に失敗しました',
    EN: 'Failed to add to cart'
  }))
  setIsAddingToCart(false)
}
```

#### 3. **APIタイムアウト処理**
**現状**: タイムアウト設定なし
**問題**: ネットワーク遅延時に永久に待機
**推奨対策**:
```typescript
const fetchWithTimeout = async (url, options, timeout = 30000) => {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return response
  } catch (error) {
    clearTimeout(id)
    if (error.name === 'AbortError') {
      throw new Error('Request timeout')
    }
    throw error
  }
}
```

#### 4. **フォーム重複送信防止**
**現状**: `LoginForm.tsx`, `RegisterForm.tsx` で loading 状態はあるが、完全な防止は不足
**問題**: ユーザーが複数回クリック可能
**推奨対策**:
- すべてのフォーム送信ボタンに `disabled={loading}` を確実に設定
- クリック後に即座に disabled にする

#### 5. **画像読み込みエラーハンドリング**
**現状**: `ProductCards.tsx:84-94` で NoImage 表示のみ
**問題**: 画像読み込み失敗時の対応がない
**推奨対策**:
```typescript
<img
  src={firstImage.url}
  alt={firstImage.altText || product.title}
  className="w-full h-full object-cover"
  onError={(e) => {
    e.currentTarget.src = '/images/placeholder.png'
    e.currentTarget.onerror = null
  }}
/>
```

#### 6. **Shopify同期失敗時の詳細なユーザーフィードバック**
**現状**: `CartContext.tsx:541` でエラーメッセージをstateに設定するが、UI表示が不明確
**問題**: ユーザーが同期失敗に気づきにくい
**推奨対策**:
- カートページでエラーメッセージを目立つように表示
- リトライボタンを提供

---

### 🟡 中優先度（推奨実装）

#### 7. **グローバルネットワークエラーハンドリング**
**現状**: 個別のAPIコールでのみエラーハンドリング
**問題**: オフライン時の統一的な対応がない
**推奨対策**:
```typescript
// src/hooks/useNetworkStatus.ts
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
```

#### 8. **セッションタイムアウト処理**
**現状**: NextAuth のデフォルト設定のみ
**問題**: タイムアウト直前の警告がない
**推奨対策**:
- セッション有効期限5分前に警告モーダル表示
- 自動ログアウト前に保存確認

#### 9. **支払いタイムアウト処理**
**現状**: `CryptoPaymentModal.tsx` で無制限に監視
**問題**: 長時間監視が続く可能性
**推奨対策**:
```typescript
// 支払い監視開始から30分後にタイムアウト
const PAYMENT_TIMEOUT = 30 * 60 * 1000 // 30分

useEffect(() => {
  if (isMonitoring) {
    const timeoutId = setTimeout(() => {
      setIsMonitoring(false)
      setError(t({
        JP: '支払いがタイムアウトしました',
        EN: 'Payment timed out'
      }))
    }, PAYMENT_TIMEOUT)

    return () => clearTimeout(timeoutId)
  }
}, [isMonitoring])
```

#### 10. **価格保証期限切れ時の明示的な警告**
**現状**: `PriceGuaranteeContext.tsx` で期限管理はあるが、警告が不明確
**問題**: ユーザーが価格変動に気づかない
**推奨対策**:
- 期限切れ30秒前にモーダル警告
- カート内で期限切れアイテムを強調表示

#### 11. **ログアウト時のカートクリア処理**
**現状**: ログアウト時にカートが残る
**問題**: セキュリティリスク（共有PC等）
**推奨対策**:
```typescript
// src/stores/authStore.ts の logout 関数内
logout: async () => {
  // カートをクリア
  localStorage.removeItem('shopify-cart')
  localStorage.removeItem('shopify-cart-id')
  localStorage.removeItem('shopify-checkout-url')

  // 認証情報クリア
  // ...
}
```

---

### 🟢 低優先度（将来的に検討）

#### 12. **オフライン対応（Service Worker）**
**現状**: オフライン時は完全に動作不可
**推奨対策**:
- Service Worker 導入
- カート情報をIndexedDBに保存
- オフライン時のUI表示

#### 13. **ブラウザバック時のカート状態保護**
**現状**: ブラウザバックで状態が失われる可能性
**推奨対策**:
```typescript
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (cartState.items.length > 0) {
      e.preventDefault()
      e.returnValue = ''
    }
  }

  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [cartState.items])
```

#### 14. **並行処理の競合制御**
**現状**: カート操作の並行実行で競合の可能性
**推奨対策**:
- 楽観的ロック（Optimistic Lock）
- リクエストキュー実装

#### 15. **アクセシビリティ改善**
**現状**: ARIA ラベル、キーボードナビゲーションが不足
**推奨対策**:
- WAI-ARIA 対応
- キーボードフォーカス管理
- スクリーンリーダー対応

#### 16. **詳細なアナリティクス**
**現状**: 基本的なログのみ
**推奨対策**:
- Google Analytics / Mixpanel 導入
- エラートラッキング（Sentry等）
- ユーザー行動分析

---

## 📊 統計サマリー

| カテゴリ | 実装済み | 抜け漏れ | 実装率 |
|---------|---------|---------|--------|
| カート機能 | 6 | 4 | 60% |
| 認証機能 | 6 | 2 | 75% |
| 支払い機能 | 5 | 3 | 63% |
| エラーハンドリング | 4 | 6 | 40% |
| ユーザーフィードバック | 4 | 2 | 67% |
| **合計** | **25** | **17** | **60%** |

---

## 🎯 推奨実装順序

### Week 1（必須）
1. カート追加失敗時のToast表示
2. 画像読み込みエラーハンドリング
3. フォーム重複送信防止の強化

### Week 2（必須）
4. React Error Boundary 実装
5. APIタイムアウト処理
6. Shopify同期失敗時のUI改善

### Week 3（推奨）
7. グローバルネットワークエラーハンドリング
8. 支払いタイムアウト処理
9. 価格保証期限切れ警告

### Week 4+（将来的）
10. セッションタイムアウト処理
11. ログアウト時のカートクリア
12. その他の低優先度項目

---

## 📝 補足

### 既に実装されている優れた点
- **MetaMaskキャンセルハンドリング**: code: 4001 とメッセージパターンの両方でキャンセルを検出
- **カート同期のリトライロジック**: 指数バックオフによる堅牢な実装
- **Zodによるバリデーション**: 型安全で保守性の高いフォーム検証
- **Toastシステム**: useToast フックによる再利用可能な実装

### 注意事項
- 本レポートは2025年10月5日時点のコードベースに基づいています
- 実装優先度は一般的なECサイトの要件に基づいていますが、ビジネス要件により変動する可能性があります
- 各機能の実装にはテストの追加も推奨します

---

**作成者**: Claude Code
**レポートバージョン**: 1.0
