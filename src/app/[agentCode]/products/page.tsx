'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useCart } from '@/contexts/CartContext'
import { useQuery } from '@apollo/client/react'
import { GET_PRODUCTS } from '@/lib/shopify-queries'
import { ShopifyProduct } from '@/types/shopify'
import { useRouter, useParams } from 'next/navigation'
import { useState } from 'react'
import { useToast } from '@/components/Toast'
import Toast from '@/components/Toast'
import { processDescriptionText } from '@/lib/text-utils'
import Header from '@/components/Header'
import { AgentDiscountBadge } from '@/components/agent/AgentDiscountBadge'

interface ProductCardProps {
  product: ShopifyProduct
  agentCode: string
}

function ProductCard({ product, agentCode }: ProductCardProps) {
  const { t } = useLanguage()
  const { addItem, formatPrice } = useCart()
  const router = useRouter()
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const { showCartSuccess } = useToast()

  const firstImage = product.images.edges[0]?.node
  const firstVariant = product.variants.edges[0]?.node

  const handleViewDetails = () => {
    router.push(`/${agentCode}/products/${product.handle}`)
  }

  const handleAddToCart = async () => {
    if (!firstVariant) return

    setIsAddingToCart(true)

    try {
      addItem(product, firstVariant.id, 1)
      showCartSuccess(product.title)

      setTimeout(() => {
        setIsAddingToCart(false)
      }, 1000)
    } catch (error) {
      console.error('カート追加エラー:', error)
      setIsAddingToCart(false)
    }
  }

  return (
    <div className="bg-gray-900/50 backdrop-blur-md border border-green-500/20 rounded-xl overflow-hidden hover:border-green-500/40 transition-all duration-300 hover:transform hover:scale-105">
      {/* 商品画像 */}
      <div className="relative h-48 overflow-hidden">
        {firstImage ? (
          <img
            src={firstImage.url}
            alt={firstImage.altText || product.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
        {/* 価格バッジ */}
        {firstVariant && (
          <div className="absolute top-3 right-3 bg-green-500 text-black px-3 py-1 rounded-full text-sm font-bold">
            {formatPrice(firstVariant.price.amount, firstVariant.price.currencyCode)}
          </div>
        )}
        {/* 代理店割引バッジ */}
        <div className="absolute top-3 left-3">
          <AgentDiscountBadge />
        </div>
      </div>

      {/* 商品情報 */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-white mb-2 line-clamp-2">
          {product.title}
        </h3>

        {product.description && (
          <div className="text-gray-300 text-sm mb-3 line-clamp-3">
            <div 
              dangerouslySetInnerHTML={{ __html: processDescriptionText(product.description) }}
            />
          </div>
        )}

        {/* ベンダー情報 */}
        {product.vendor && (
          <div className="flex items-center mb-3">
            <span className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
              {product.vendor}
            </span>
          </div>
        )}

        {/* 在庫状況 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {firstVariant?.availableForSale ? (
              <span className="text-green-400 text-sm flex items-center">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                {t({ JP: '在庫あり', EN: 'In Stock' })}
              </span>
            ) : (
              <span className="text-red-400 text-sm flex items-center">
                <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                {t({ JP: '在庫なし', EN: 'Out of Stock' })}
              </span>
            )}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <button
            onClick={handleViewDetails}
            className="flex-1 bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-4 rounded-lg transition-colors duration-200 transform hover:scale-105"
          >
            {t({ JP: '詳細を見る', EN: 'View Details' })}
          </button>
          {firstVariant?.availableForSale && (
            <button
              onClick={handleAddToCart}
              disabled={isAddingToCart}
              className={`bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-all duration-200 ${
                isAddingToCart
                  ? 'opacity-50 cursor-not-allowed'
                  : 'transform hover:scale-105'
              }`}
            >
              {isAddingToCart ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                  {t({ JP: '追加中...', EN: 'Adding...' })}
                </div>
              ) : (
                t({ JP: 'カートに追加', EN: 'Add to Cart' })
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AgentProductsPage() {
  const { t } = useLanguage()
  const params = useParams()
  const agentCode = params.agentCode as string
  const { data, loading, error } = useQuery(GET_PRODUCTS, {
    variables: { first: 50 },
    errorPolicy: 'all',
    fetchPolicy: 'cache-and-network'
  })
  const { toasts, hideToast } = useToast()

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <span className="inline-block bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-full text-sm mb-12">
                {t({ JP: '商品一覧', EN: 'Our Products' })}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-10">
                {t({ JP: 'MOTHER VEGETABLES製品', EN: 'MOTHER VEGETABLES Products' })}
              </h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {[...Array(12)].map((_, index) => (
                <div key={index} className="bg-gray-900/50 backdrop-blur-md border border-green-500/20 rounded-xl p-4 animate-pulse">
                  <div className="h-48 bg-gray-800 rounded-lg mb-4"></div>
                  <div className="h-4 bg-gray-800 rounded mb-2"></div>
                  <div className="h-3 bg-gray-800 rounded mb-4"></div>
                  <div className="h-10 bg-gray-800 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (error) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <span className="inline-block bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-full text-sm mb-12">
                {t({ JP: '商品一覧', EN: 'Our Products' })}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-10">
                {t({ JP: 'MOTHER VEGETABLES製品', EN: 'MOTHER VEGETABLES Products' })}
              </h1>
            </div>
            <div className="text-center">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8">
                <h3 className="text-red-400 text-xl font-bold mb-4">
                  {t({ JP: '商品の読み込みに失敗しました', EN: 'Failed to load products' })}
                </h3>
                <p className="text-gray-300 mb-4">
                  {t({ JP: 'Shopifyストアに接続できません。設定を確認してください。', EN: 'Unable to connect to Shopify store. Please check your configuration.' })}
                </p>
                <p className="text-sm text-gray-400">
                  {t({ JP: 'エラー詳細', EN: 'Error Details' })}: {error.message}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  const products = data?.products?.edges?.map((edge: { node: ShopifyProduct }) => edge.node) || []

  if (products.length === 0) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-black pt-20">
          <div className="container mx-auto px-4 py-16">
            <div className="text-center mb-16">
              <span className="inline-block bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-full text-sm mb-12">
                {t({ JP: '商品一覧', EN: 'Our Products' })}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-10">
                {t({ JP: 'MOTHER VEGETABLES製品', EN: 'MOTHER VEGETABLES Products' })}
              </h1>
            </div>
            <div className="text-center">
              <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-8">
                <h3 className="text-gray-400 text-xl font-bold mb-4">
                  {t({ JP: '商品が見つかりませんでした', EN: 'No products found' })}
                </h3>
                <p className="text-gray-300">
                  {t({ JP: 'Shopifyストアに商品が登録されていないか、設定が正しくない可能性があります。', EN: 'No products are registered in the Shopify store or the configuration may be incorrect.' })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Header />
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => hideToast(toast.id)}
        />
      ))}

      <div className="min-h-screen bg-black pt-20">
        <div className="container mx-auto px-4 py-16">
          {/* ページヘッダー */}
          <div className="text-center mb-16">
            <span className="inline-block bg-green-500/20 border border-green-500/50 text-green-400 px-4 py-2 rounded-full text-sm mb-12">
              {t({ JP: '商品一覧', EN: 'Our Products' })}
            </span>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-10">
              {t({ JP: 'MOTHER VEGETABLES製品', EN: 'MOTHER VEGETABLES Products' })}
            </h1>
            <p className="text-sm md:text-base text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {t({
                JP: '地球最初の生命体から生まれた、8つの産業分野に対応したMOTHER VEGETABLES製品をご紹介します。',
                EN: 'Introducing MOTHER VEGETABLES products for 8 industrial sectors, born from Earth\'s first life form.'
              })}
            </p>
          </div>

          {/* 代理店情報 */}
          <div className="text-center mb-12">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 inline-block">
              <p className="text-blue-300 font-medium">
                {t({ JP: '代理店経由でのご購入', EN: 'Purchasing through agent' })}
              </p>
              <p className="text-blue-400 text-sm">
                {t({ JP: `代理店コード: ${agentCode}`, EN: `Agent Code: ${agentCode}` })}
              </p>
            </div>
          </div>

          {/* 商品統計 */}
          <div className="text-center mb-12">
            <p className="text-gray-400">
              {t({ JP: `全 ${products.length} 商品`, EN: `All ${products.length} Products` })}
            </p>
          </div>

          {/* 商品グリッド */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {products.map((product: ShopifyProduct) => (
              <ProductCard key={product.id} product={product} agentCode={agentCode} />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
