'use client';

import { ApolloProvider } from '@apollo/client/react';
import { shopifyClient } from './shopify-client';

interface ShopifyApolloProviderProps {
  children: React.ReactNode;
}

export function ShopifyApolloProvider({ children }: ShopifyApolloProviderProps) {
  return (
    <ApolloProvider client={shopifyClient}>
      {children}
    </ApolloProvider>
  );
}
