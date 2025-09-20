// Shopify GraphQL API Types

export interface ShopifyImage {
  id: string;
  url: string;
  altText?: string;
  width?: number;
  height?: number;
}

export interface ShopifyProductVariant {
  id: string;
  title: string;
  price: {
    amount: string;
    currencyCode: string;
  };
  compareAtPrice?: {
    amount: string;
    currencyCode: string;
  };
  availableForSale: boolean;
  selectedOptions: Array<{
    name: string;
    value: string;
  }>;
  image?: ShopifyImage;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  vendor: string;
  productType: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  images: {
    edges: Array<{
      node: ShopifyImage;
    }>;
  };
  variants: {
    edges: Array<{
      node: ShopifyProductVariant;
    }>;
  };
  options: Array<{
    id: string;
    name: string;
    values: string[];
  }>;
}

export interface ShopifyCollection {
  id: string;
  title: string;
  description: string;
  handle: string;
  updatedAt: string;
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

export interface ShopifyCustomer {
  id: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  acceptsMarketing: boolean;
  createdAt: string;
  updatedAt: string;
  addresses: {
    edges: Array<{
      node: {
        id: string;
        address1?: string;
        address2?: string;
        city?: string;
        country?: string;
        zip?: string;
        phone?: string;
      };
    }>;
  };
}

export interface ShopifyCart {
  id: string;
  lines: {
    edges: Array<{
      node: {
        id: string;
        quantity: number;
        merchandise: {
          id: string;
          title: string;
          selectedOptions: Array<{
            name: string;
            value: string;
          }>;
          product: {
            id: string;
            title: string;
            handle: string;
            images: {
              edges: Array<{
                node: {
                  url: string;
                  altText?: string;
                };
              }>;
            };
          };
          price: {
            amount: string;
            currencyCode: string;
          };
        };
      };
    }>;
  };
  cost: {
    totalAmount: {
      amount: string;
      currencyCode: string;
    };
    subtotalAmount: {
      amount: string;
      currencyCode: string;
    };
    totalTaxAmount?: {
      amount: string;
      currencyCode: string;
    };
  };
  totalQuantity: number;
}

// GraphQL Query Response Types
export interface ProductsQueryResponse {
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      startCursor?: string;
      endCursor?: string;
    };
  };
}

export interface ProductQueryResponse {
  product: ShopifyProduct;
}

export interface CollectionsQueryResponse {
  collections: {
    edges: Array<{
      node: ShopifyCollection;
    }>;
  };
}
