import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';

// Shopify Storefront GraphQL endpoint
const SHOPIFY_STOREFRONT_URL = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN 
  ? `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/api/2024-01/graphql.json`
  : '';

// 環境変数のチェック
if (!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN || !process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN) {
  console.error('Missing required Shopify environment variables');
  console.error('NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN:', !!process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN);
  console.error('NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN:', !!process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN);
}

// HTTP link for GraphQL requests
const httpLink = createHttpLink({
  uri: SHOPIFY_STOREFRONT_URL || 'https://placeholder.myshopify.com/api/2024-01/graphql.json',
});

// Auth link to add Storefront Access Token
const authLink = setContext((_, { headers }) => {
  const token = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  
  return {
    headers: {
      ...headers,
      'X-Shopify-Storefront-Access-Token': token,
      'Content-Type': 'application/json',
    }
  }
});

// Apollo Client configuration
export const shopifyClient = new ApolloClient({
  link: from([authLink, httpLink]),
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

// Admin API client for server-side operations
export const createShopifyAdminClient = () => {
  const adminUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN 
    ? `https://${process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/graphql.json`
    : '';

  const adminHttpLink = createHttpLink({
    uri: adminUrl,
  });

  const adminAuthLink = setContext((_, { headers }) => {
    const token = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN;
    
    return {
      headers: {
        ...headers,
        'X-Shopify-Access-Token': token,
        'Content-Type': 'application/json',
      }
    }
  });

  return new ApolloClient({
    link: from([adminAuthLink, adminHttpLink]),
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
};

// Utility function to get store configuration
export const getShopifyConfig = () => {
  return {
    storeDomain: process.env.NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN,
    storefrontAccessToken: process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN,
    adminAccessToken: process.env.SHOPIFY_ADMIN_ACCESS_TOKEN,
    storeName: process.env.NEXT_PUBLIC_SHOPIFY_STORE_NAME || 'Shop',
    apiVersion: process.env.SHOPIFY_API_VERSION || '2024-01',
  };
};

// Helper function to format price (基本版 - カートコンテキストで上書きされます)
export const formatPrice = (amount: string, currencyCode: string) => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
};

// Helper function to get product URL
export const getProductUrl = (handle: string) => {
  return `/products/${handle}`;
};

// Helper function to get collection URL
export const getCollectionUrl = (handle: string) => {
  return `/collections/${handle}`;
};
