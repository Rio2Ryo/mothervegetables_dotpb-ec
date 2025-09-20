// 自動生成されたGraphQL型定義のダミーファイル
// 実際の実装では、GraphQL Code Generatorを使用して自動生成します

export interface CustomerAccessToken {
  accessToken: string;
  expiresAt: string;
}

export interface CustomerUserError {
  code?: string;
  field?: string[];
  message: string;
}

export interface CustomerAccessTokenCreateMutation {
  customerAccessTokenCreate?: {
    customerAccessToken?: CustomerAccessToken;
    customerUserErrors?: CustomerUserError[];
  };
}

export interface CustomerAccessTokenCreateMutationVariables {
  input: {
    email: string;
    password: string;
  };
}

export interface CustomerAccessTokenDeleteMutation {
  customerAccessTokenDelete?: {
    deletedAccessToken?: string;
    deletedCustomerAccessTokenId?: string;
    userErrors?: CustomerUserError[];
  };
}

export interface CustomerAccessTokenDeleteMutationVariables {
  customerAccessToken: string;
}

export interface Address {
  id: string;
  address1?: string;
  address2?: string;
  city?: string;
  province?: string;
  zip?: string;
  country?: string;
  phone?: string;
}

export interface Customer {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  acceptsMarketing?: boolean;
  defaultAddress?: Address;
  addresses?: {
    edges: Array<{
      node: Address;
    }>;
  };
}

export interface GetCustomerQuery {
  customer?: Customer;
}

export interface GetCustomerQueryVariables {
  customerAccessToken: string;
}

export interface CustomerCreateInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  acceptsMarketing?: boolean;
}

export interface CustomerCreateMutation {
  customerCreate?: {
    customer?: Customer;
    customerAccessToken?: CustomerAccessToken;
    customerUserErrors?: CustomerUserError[];
  };
}

export interface CustomerCreateMutationVariables {
  input: CustomerCreateInput;
}
