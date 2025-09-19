'use client'

import { useCart, CartItem } from '@/contexts/CartContext'
import { useLanguage } from '@/contexts/LanguageContext'

interface CartItemProps {
  item: CartItem
}

export default function CartItemComponent({ item }: CartItemProps) {
  const { t } = useLanguage()
  const { removeItem, updateQuantity, formatPrice } = useCart()

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return
    updateQuantity(item.variantId, newQuantity)
  }

  const handleRemove = () => {
    removeItem(item.variantId)
  }

  return (
    <div className="flex items-center space-x-4 p-4 bg-gray-900/50 border border-green-500/20 rounded-lg">
      {/* 商品画像 */}
      <div className="flex-shrink-0">
        {item.image ? (
          <img
            src={item.image}
            alt={item.title}
            className="w-16 h-16 object-cover rounded-lg"
          />
        ) : (
          <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center">
            <span className="text-gray-500 text-xs">No Image</span>
          </div>
        )}
      </div>

      {/* 商品情報 */}
      <div className="flex-grow min-w-0">
        <h3 className="text-sm font-medium text-white truncate">
          {item.title}
        </h3>
        <p className="text-xs text-gray-400 mt-1">
          {item.selectedOptions.map(option => `${option.name}: ${option.value}`).join(', ')}
        </p>
        <p className="text-sm font-bold text-green-400 mt-1">
          {formatPrice(item.price, item.currencyCode)}
        </p>
      </div>

      {/* 数量コントロール */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => handleQuantityChange(item.quantity - 1)}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
          disabled={item.quantity <= 1}
        >
          -
        </button>
        <span className="w-8 text-center text-white font-medium">
          {item.quantity}
        </span>
        <button
          onClick={() => handleQuantityChange(item.quantity + 1)}
          className="w-8 h-8 bg-gray-700 hover:bg-gray-600 text-white rounded-full flex items-center justify-center text-sm font-bold"
        >
          +
        </button>
      </div>

      {/* 小計 */}
      <div className="text-right">
        <p className="text-sm font-bold text-white">
          {formatPrice((parseFloat(item.price) * item.quantity).toString(), item.currencyCode)}
        </p>
      </div>

      {/* 削除ボタン */}
      <button
        onClick={handleRemove}
        className="text-red-400 hover:text-red-300 p-2"
        title={t({ JP: 'カートから削除', EN: 'Remove from cart' })}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  )
}
