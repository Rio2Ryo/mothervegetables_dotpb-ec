import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Shopify Storefront APIのエンドポイント
const SHOPIFY_STOREFRONT_ENDPOINT = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT;
const SHOPIFY_STOREFRONT_ACCESS_TOKEN = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;

if (!SHOPIFY_STOREFRONT_ENDPOINT || !SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  throw new Error('Shopify Storefront API設定が不足しています');
}

// HTTPリンクの作成
const httpLink = createHttpLink({
  uri: SHOPIFY_STOREFRONT_ENDPOINT,
  headers: {
    'X-Shopify-Storefront-Access-Token': SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    'Content-Type': 'application/json',
  },
});

// Apollo Clientの作成
export const shopifyClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
