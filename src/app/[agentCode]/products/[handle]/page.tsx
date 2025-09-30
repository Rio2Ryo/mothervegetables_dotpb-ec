'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { useCart } from '@/contexts/CartContext'
import { useQuery } from '@apollo/client/react'
import { GET_PRODUCT_BY_HANDLE } from '@/lib/shopify-queries'
import { ShopifyProduct, ShopifyProductVariant, ShopifyImage } from '@/types/shopify'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useToast } from '@/components/Toast'
import Toast from '@/components/Toast'
import { processDescriptionText } from '@/lib/text-utils'
import { AgentDiscountBadge } from '@/components/agent/AgentDiscountBadge'
import Image from 'next/image'

interface ProductPageProps {
  params: Promise<{
    handle: string
  }>
}

export default function AgentProductPage({ params }: ProductPageProps) {
  return <AgentProductPageClient params={params} />
}

function AgentProductPageClient({ params }: { params: Promise<{ handle: string }> }) {
  const { t } = useLanguage()
  const { addItem, formatPrice } = useCart()
  const router = useRouter()
  const urlParams = useParams()
  const agentCode = urlParams.agentCode as string
  const [selectedVariantId, setSelectedVariantId] = useState<string>('')
  const [quantity, setQuantity] = useState(1)
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [handle, setHandle] = useState<string>('')
  const { showCartSuccess, toasts, hideToast } = useToast()

  // paramsを非同期で処理
  useEffect(() => {
    params.then(({ handle }) => {
      setHandle(handle)
    })
  }, [params])

  // URLエンコードされたhandleをデコード
  const decodedHandle = handle ? decodeURIComponent(handle) : ''

  const { data, loading, error } = useQuery(GET_PRODUCT_BY_HANDLE, {
    variables: { handle: decodedHandle },
    errorPolicy: 'all',
    skip: !decodedHandle
  })

  const product: ShopifyProduct = data?.product

  // handleが取得されるまでのローディング
  if (!handle) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              <div className="space-y-4">
                <div className="h-96 bg-gray-800 rounded-xl"></div>
                <div className="flex space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 w-20 bg-gray-800 rounded-lg"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3"></div>
                <div className="h-12 bg-gray-800 rounded w-1/2"></div>
                <div className="h-12 bg-gray-800 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-16">
          <div className="animate-pulse">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
              <div className="space-y-4">
                <div className="h-96 bg-gray-800 rounded-xl"></div>
                <div className="flex space-x-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-20 w-20 bg-gray-800 rounded-lg"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-800 rounded w-3/4"></div>
                <div className="h-4 bg-gray-800 rounded w-full"></div>
                <div className="h-4 bg-gray-800 rounded w-2/3"></div>
                <div className="h-12 bg-gray-800 rounded w-1/2"></div>
                <div className="h-12 bg-gray-800 rounded w-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-8">
              <h1 className="text-red-400 text-2xl font-bold mb-4">
                {t({ JP: '商品が見つかりません', EN: 'Product Not Found' })}
              </h1>
              <p className="text-gray-300 mb-6">
                {t({ JP: '指定された商品は存在しないか、削除された可能性があります。', EN: 'The specified product may not exist or may have been deleted.' })}
              </p>
              {error && (
                <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left">
                  <h3 className="text-red-400 font-bold mb-2">エラー詳細:</h3>
                  <pre className="text-gray-300 text-sm overflow-auto">
                    {JSON.stringify(error, null, 2)}
                  </pre>
                </div>
              )}
              <div className="bg-gray-800 rounded-lg p-4 mb-4 text-left">
                <h3 className="text-blue-400 font-bold mb-2">デバッグ情報:</h3>
                <p className="text-gray-300 text-sm">Original Handle: {handle}</p>
                <p className="text-gray-300 text-sm">Decoded Handle: {decodedHandle}</p>
                <p className="text-gray-300 text-sm">Loading: {loading.toString()}</p>
                <p className="text-gray-300 text-sm">Product exists: {product ? 'Yes' : 'No'}</p>
              </div>
              <button
                onClick={() => router.push(`/${agentCode}/products`)}
                className="bg-green-500 hover:bg-green-600 text-black font-bold py-2 px-6 rounded-lg transition-colors duration-200"
              >
                {t({ JP: '商品一覧に戻る', EN: 'Back to Products' })}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const variants = product.variants.edges.map((edge: { node: ShopifyProductVariant }) => edge.node)
  const selectedVariant = variants.find((v: ShopifyProductVariant) => v.id === selectedVariantId) || variants[0]
  const images = product.images.edges.map((edge: { node: ShopifyImage }) => edge.node)

  const handleAddToCart = async () => {
    if (!selectedVariant) return
    
    setIsAddingToCart(true)
    
    try {
      addItem(product, selectedVariant.id, quantity)
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
    <>
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={toast.isVisible}
          onClose={() => hideToast(toast.id)}
        />
      ))}
      
      <div className="min-h-screen bg-black">
        <div className="container mx-auto px-4 py-16">
          {/* パンくずリスト */}
          <nav className="mb-8">
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <button 
                onClick={() => router.push(`/${agentCode}`)}
                className="hover:text-green-400 transition-colors"
              >
                {t({ JP: 'ホーム', EN: 'Home' })}
              </button>
              <span>/</span>
              <button 
                onClick={() => router.push(`/${agentCode}/products`)}
                className="hover:text-green-400 transition-colors"
              >
                {t({ JP: '商品', EN: 'Products' })}
              </button>
              <span>/</span>
              <span className="text-white">{product.title}</span>
            </div>
          </nav>

          {/* 代理店情報 */}
          <div className="mb-8">
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 inline-block">
              <p className="text-blue-300 font-medium">
                {t({ JP: '代理店経由でのご購入', EN: 'Purchasing through agent' })}
              </p>
              <p className="text-blue-400 text-sm">
                {t({ JP: `代理店コード: ${agentCode}`, EN: `Agent Code: ${agentCode}` })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12">
            {/* 商品画像 */}
            <div className="space-y-4">
              <div className="relative">
                <Image
                  src={images[selectedImageIndex]?.url || images[0]?.url}
                  alt={images[selectedImageIndex]?.altText || product.title}
                  width={400}
                  height={384}
                  className="w-full h-96 object-cover rounded-xl"
                />
                {selectedVariant && (
                  <div className="absolute top-4 right-4 bg-green-500 text-black px-3 py-1 rounded-full text-lg font-bold">
                    {formatPrice(selectedVariant.price.amount, selectedVariant.price.currencyCode)}
                  </div>
                )}
                {/* 代理店割引バッジ */}
                <div className="absolute top-4 left-4">
                  <AgentDiscountBadge />
                </div>
              </div>
              
              {/* サムネイル画像 */}
              {images.length > 1 && (
                <div className="flex space-x-2 overflow-x-auto">
                  {images.map((image, index) => (
                    <button
                      key={index}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                        selectedImageIndex === index
                          ? 'border-green-500'
                          : 'border-gray-700 hover:border-gray-500'
                      }`}
                    >
                      <img
                        src={image.url}
                        alt={image.altText || `${product.title} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 商品情報 */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">
                  {product.title}
                </h1>
                {product.vendor && (
                  <p className="text-green-400 text-lg">
                    {product.vendor}
                  </p>
                )}
              </div>

              {/* 商品説明 */}
              {product.description && (
                <div className="prose prose-invert max-w-none">
                  <div 
                    className="text-gray-300 leading-relaxed prose-p:text-gray-300 prose-strong:text-white prose-em:text-gray-200 prose-h1:text-white prose-h2:text-white prose-h3:text-white prose-h4:text-white prose-h5:text-white prose-h6:text-white prose-ul:text-gray-300 prose-ol:text-gray-300 prose-li:text-gray-300"
                    dangerouslySetInnerHTML={{ __html: processDescriptionText(product.description) }}
                  />
                </div>
              )}

              {/* バリエーション選択 */}
              {variants.length > 1 && (
                <div>
                  <h3 className="text-white font-semibold mb-3">
                    {t({ JP: 'バリエーション', EN: 'Variants' })}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {variants.map((variant) => (
                      <button
                        key={variant.id}
                        onClick={() => setSelectedVariantId(variant.id)}
                        className={`p-3 rounded-lg border text-left transition-colors ${
                          selectedVariantId === variant.id
                            ? 'border-green-500 bg-green-500/10 text-green-400'
                            : variant.availableForSale
                            ? 'border-gray-700 hover:border-gray-500 text-white'
                            : 'border-gray-800 bg-gray-800/50 text-gray-500 cursor-not-allowed'
                        }`}
                        disabled={!variant.availableForSale}
                      >
                        <div className="font-medium">
                          {variant.title}
                        </div>
                        <div className="text-sm">
                          {formatPrice(variant.price.amount, variant.price.currencyCode)}
                        </div>
                        {!variant.availableForSale && (
                          <div className="text-xs text-red-400">
                            {t({ JP: '在庫なし', EN: 'Out of Stock' })}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 数量選択 */}
              <div>
                <h3 className="text-white font-semibold mb-3">
                  {t({ JP: '数量', EN: 'Quantity' })}
                </h3>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    -
                  </button>
                  <span className="text-white font-medium w-12 text-center">
                    {quantity}
                  </span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* 在庫状況 */}
              <div className="flex items-center space-x-2">
                {selectedVariant?.availableForSale ? (
                  <span className="text-green-400 flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    {t({ JP: '在庫あり', EN: 'In Stock' })}
                  </span>
                ) : (
                  <span className="text-red-400 flex items-center">
                    <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                    {t({ JP: '在庫なし', EN: 'Out of Stock' })}
                  </span>
                )}
              </div>

              {/* アクションボタン */}
              <div className="space-y-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!selectedVariant?.availableForSale || isAddingToCart}
                  className={`w-full py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
                    selectedVariant?.availableForSale && !isAddingToCart
                      ? 'bg-green-500 hover:bg-green-600 text-black transform hover:scale-105'
                      : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isAddingToCart ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin mr-2"></div>
                      {t({ JP: '追加中...', EN: 'Adding...' })}
                    </div>
                  ) : (
                    t({ JP: 'カートに追加', EN: 'Add to Cart' })
                  )}
                </button>
                
                <button
                  onClick={() => router.push(`/${agentCode}/products`)}
                  className="w-full py-3 px-6 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-colors"
                >
                  {t({ JP: '商品一覧に戻る', EN: 'Back to Products' })}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
