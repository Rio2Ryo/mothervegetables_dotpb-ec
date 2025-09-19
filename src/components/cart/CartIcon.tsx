'use client'

import { useCart } from '@/contexts/CartContext'
import { useLanguage } from '@/contexts/LanguageContext'
import Link from 'next/link'

export default function CartIcon() {
  const { state } = useCart()
  const { t } = useLanguage()

  return (
    <Link 
      href="/cart" 
      className="relative flex items-center justify-center w-10 h-10 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors duration-200"
      title={t({ JP: 'ショッピングカート', EN: 'Shopping Cart' })}
    >
      {/* カートアイコン */}
      <svg 
        className="w-6 h-6 text-white" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 3h2l.4 2M7 13h10l4-8H5.4m0 0L7 13m0 0l-2.5 5M7 13l2.5 5m0 0h6m-6 0a2 2 0 100 4 2 2 0 000-4zm6 0a2 2 0 100 4 2 2 0 000-4z" 
        />
      </svg>
      
      {/* アイテム数バッジ */}
      {state.totalQuantity > 0 && (
        <span className="absolute -top-2 -right-2 bg-green-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {state.totalQuantity > 99 ? '99+' : state.totalQuantity}
        </span>
      )}
    </Link>
  )
}
