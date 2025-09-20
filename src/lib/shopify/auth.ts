import { 
  createCustomerAccessToken,
  getCustomer,
  createCustomerAndLogin,
  deleteCustomerAccessToken
} from './storefront-client';
import type { 
  Customer, 
  CustomerAccessToken, 
  CustomerUserError, 
  CustomerCreateInput,
  LoginFormData 
} from '@/services/shopify/types';

// 関数は storefront-client.ts から再エクスポート
export { 
  createCustomerAccessToken,
  getCustomer,
  createCustomerAndLogin,
  deleteCustomerAccessToken
};

