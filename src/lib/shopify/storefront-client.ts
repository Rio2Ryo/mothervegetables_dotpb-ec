import type { 
  Customer, 
  CustomerAccessToken, 
  CustomerUserError, 
  CustomerCreateInput,
  LoginFormData 
} from '@/services/shopify/types';

// Shopify Storefront APIクライアント
class ShopifyStorefrontClient {
  private endpoint: string;
  private accessToken: string;

  constructor() {
    this.endpoint = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ENDPOINT || 'https://gfzqyh-gw.myshopify.com/api/2024-01/graphql.json';
    this.accessToken = process.env.NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN || '97cca1d688dcae8d78c95c96a217a9c0';

    if (!this.endpoint || !this.accessToken) {
      console.error('Shopify Storefront API configuration missing:', {
        endpoint: this.endpoint,
        hasToken: !!this.accessToken
      });
      throw new Error('Shopify Storefront API設定が不足しています');
    }
  }

  async request(query: string, variables: any = {}) {
    try {
      console.log('Shopify Storefront API Request:', {
        endpoint: this.endpoint,
        query: query.substring(0, 100) + '...',
        variables,
      });

      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'X-Shopify-Storefront-Access-Token': this.accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          variables,
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));

      if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        const errorMessage = data.errors.map((e: any) => e.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessage}`);
      }

      return data.data;
    } catch (error) {
      console.error('Shopify Storefront API request error:', error);
      throw error;
    }
  }
}

// シングルトンインスタンス
export const shopifyStorefront = new ShopifyStorefrontClient();

// 顧客アクセストークンを作成
export async function createCustomerAccessToken(
  input: LoginFormData
): Promise<{
  customerAccessToken?: CustomerAccessToken;
  errors?: CustomerUserError[];
}> {
  try {
    const mutation = `
      mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
        customerAccessTokenCreate(input: $input) {
          customerAccessToken {
            accessToken
            expiresAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        email: input.email,
        password: input.password,
      },
    };

    const response = await shopifyStorefront.request(mutation, variables);
    const result = response.customerAccessTokenCreate;

    if (result.customerUserErrors.length > 0) {
      return {
        errors: result.customerUserErrors,
      };
    }

    return {
      customerAccessToken: result.customerAccessToken,
    };
  } catch (error) {
    console.error('Error creating customer access token:', error);
    throw error;
  }
}

// 顧客情報を取得
export async function getCustomer(
  customerAccessToken: string
): Promise<{
  customer?: Customer;
  errors?: CustomerUserError[];
}> {
  try {
    const query = `
      query getCustomer($customerAccessToken: String!) {
        customer(customerAccessToken: $customerAccessToken) {
          id
          email
          firstName
          lastName
          phone
          acceptsMarketing
          createdAt
          updatedAt
        }
      }
    `;

    const variables = {
      customerAccessToken,
    };

    const response = await shopifyStorefront.request(query, variables);
    const customer = response.customer;

    if (!customer) {
      return {
        errors: [{
          code: 'CUSTOMER_NOT_FOUND',
          field: ['customerAccessToken'],
          message: '顧客が見つかりません',
        }],
      };
    }

    return {
      customer,
    };
  } catch (error) {
    console.error('Error getting customer:', error);
    throw error;
  }
}

// 顧客を作成してログイン
export async function createCustomerAndLogin(
  input: CustomerCreateInput
): Promise<{
  customer?: Customer;
  customerAccessToken?: CustomerAccessToken;
  errors?: CustomerUserError[];
}> {
  try {
    const mutation = `
      mutation customerCreate($input: CustomerCreateInput!) {
        customerCreate(input: $input) {
          customer {
            id
            email
            firstName
            lastName
            phone
            acceptsMarketing
            createdAt
            updatedAt
          }
          customerUserErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        password: input.password,
        phone: input.phone,
        acceptsMarketing: input.acceptsMarketing,
      },
    };

    console.log('Creating customer with variables:', variables);

    const response = await shopifyStorefront.request(mutation, variables);
    const result = response.customerCreate;

    console.log('Customer creation response:', result);

    if (result.customerUserErrors && result.customerUserErrors.length > 0) {
      console.error('Customer creation errors:', result.customerUserErrors);
      return {
        errors: result.customerUserErrors,
      };
    }

    if (!result.customer) {
      return {
        errors: [{
          code: 'CUSTOMER_CREATION_FAILED',
          field: ['general'],
          message: '顧客の作成に失敗しました',
        }],
      };
    }

    // 顧客作成成功後、自動ログイン
    console.log('Customer created successfully, attempting login...');
    const loginResult = await createCustomerAccessToken({
      email: input.email,
      password: input.password,
    });

    if (loginResult.errors || !loginResult.customerAccessToken) {
      return {
        customer: result.customer,
        errors: loginResult.errors || [{
          code: 'LOGIN_FAILED',
          field: ['email', 'password'],
          message: 'ログインに失敗しました',
        }],
      };
    }

    return {
      customer: result.customer,
      customerAccessToken: loginResult.customerAccessToken,
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    throw error;
  }
}

// アクセストークンを削除（ログアウト）
export async function deleteCustomerAccessToken(
  customerAccessToken: string
): Promise<boolean> {
  try {
    const mutation = `
      mutation customerAccessTokenDelete($customerAccessToken: String!) {
        customerAccessTokenDelete(customerAccessToken: $customerAccessToken) {
          deletedAccessToken
          deletedCustomerAccessTokenId
          userErrors {
            code
            field
            message
          }
        }
      }
    `;

    const variables = {
      customerAccessToken,
    };

    const response = await shopifyStorefront.request(mutation, variables);
    const result = response.customerAccessTokenDelete;

    return result.userErrors.length === 0;
  } catch (error) {
    console.error('Error deleting customer access token:', error);
    return false;
  }
}
