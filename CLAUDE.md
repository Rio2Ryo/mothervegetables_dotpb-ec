# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development
npm run dev          # Start Next.js dev server on http://localhost:3000

# Build & Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## Architecture Overview

This is a **multi-tenant e-commerce platform** integrating cryptocurrency payments with Shopify. The app supports multiple authentication methods and agent-based routing.

### Multi-Tenant Agent System

- **URL Structure**: `/:agentCode/products`, `/:agentCode/cart`
- **Middleware**: `src/middleware.ts` validates agent codes via `/api/agents`
- **Cookie Management**: Stores `tenant` cookie for 7 days
- **Discount Logic**: Agent-specific discounts applied via `AgentDiscountBadge`

### Authentication Architecture (3 Independent Systems)

The app has **three parallel authentication systems** that don't fully integrate:

1. **NextAuth.js (Google OAuth)**
   - Primary: `src/app/api/auth/[...nextauth]/route.ts`
   - Provider: `SessionProvider` wraps entire app
   - Session: `useSession()` from `next-auth/react`

2. **MetaMask (Wagmi + Web3)**
   - Context: `src/contexts/MetaMaskAuthContext.tsx`
   - Provider: `MetaMaskAuthProvider` with `WagmiProvider`
   - Wallet: Injected connector for MetaMask signatures
   - Chains: Mainnet, Sepolia, Polygon, Polygon Amoy (config: `src/lib/wagmi-config.ts`)

3. **Shopify Customer Auth (Custom)**
   - Store: `src/stores/authStore.ts` (Zustand with persistence)
   - API: `/api/auth/login`, `/api/auth/register`, `/api/auth/logout`
   - Modal: `AuthModal` component manages login/register UI

**Important**: Header component (`src/components/Header.tsx`) prioritizes NextAuth session over others.

### Payment Systems

#### Crypto Payment Flow (HD Wallet + Alchemy)

1. **OrderID Generation**: `src/lib/utils/order-id.ts` creates unique order IDs
2. **Address Derivation**: `src/lib/crypto/wallet-manager.ts` uses BIP39 mnemonic (`MASTER_SEED`) to generate deterministic addresses via `ethers.HDNodeWallet`
   - Path: `m/44'/60'/0'/0/{hash(orderId_timestamp)}`
3. **Draft Order Creation**: `src/lib/shopify/graphql-order-manager.ts` creates Shopify draft orders via GraphQL
4. **Payment Tracking**: `src/app/api/crypto/generate-address/route.ts` orchestrates the flow
5. **Webhook Detection**: `src/app/api/crypto/webhook/alchemy/route.ts` listens for Alchemy webhooks on deposit

**Critical**: OrderID and payment address **must be generated atomically** in `CartContext.generateCryptoPayment()`.

#### Credit Card Payment

- Redirects to Shopify Checkout via `cart.checkoutUrl`
- API: `src/app/api/checkout/create/route.ts`

### State Management

- **Zustand**: `authStore.ts` (auth), `agentStore.ts` (agent info)
- **React Context**:
  - `CartContext` - Cart state with Shopify sync
  - `MetaMaskAuthContext` - Web3 wallet state
  - `MetaMaskShopifyCartContext` - Bridges MetaMask + Shopify cart
  - `PriceGuaranteeContext` - ETH price freezing mechanism
  - `LanguageContext` - JP/EN localization
  - `ShopContext` - Shopify store metadata

### Cart System

**Dual-layer cart architecture**:

1. **Local State** (`CartContext`):
   - Reducer: `cartReducer` with actions like `ADD_ITEM`, `REMOVE_ITEM`
   - Storage: `localStorage` key `shopify-cart`
   - Debouncing: 500ms delay before Shopify sync

2. **Shopify Cart** (Storefront API):
   - Sync: `syncWithShopify()` with retry logic (3 attempts, exponential backoff)
   - API: `/api/cart` (POST for create, PUT for update/replace)
   - ID: Stored in `shopifyCartId` state

**Price Guarantee**: `PriceGuaranteeContext` locks ETH prices for cart items to prevent slippage during checkout.

### API Route Conventions

- **Shopify Storefront**: `/api/products`, `/api/collections`, `/api/cart`
- **Shopify Admin**: `/api/shopify/*` (uses Admin API client)
- **Auth**: `/api/auth/{login,register,logout,me}`, `/api/auth/[...nextauth]`
- **Crypto**: `/api/crypto/{generate-address,webhook/alchemy}`
- **Agent**: `/api/agents` (validates agent codes)

### Environment Variables

**Required**:
- `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `NEXT_PUBLIC_SHOPIFY_STOREFRONT_ACCESS_TOKEN`
- `ALCHEMY_API_KEY`
- `MASTER_SEED` (BIP39 mnemonic for HD wallet)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

**Network** (default Sepolia):
- `NEXT_PUBLIC_NETWORK=sepolia`
- `NEXT_PUBLIC_CHAIN_ID=11155111`

### Key Technical Decisions

1. **No Database**: All state in localStorage + Shopify backend
2. **GraphQL over REST**: Shopify Admin uses GraphQL client (`@shopify/admin-api-client`)
3. **Turbopack Disabled**: `next.config.ts` explicitly disables it
4. **React 19**: Using latest React with experimental features
5. **Webpack Fallbacks**: Ignores React Native dependencies (`@react-native-async-storage`)

### Component Organization

- **UI Components**: `src/components/ui/*` (shadcn/ui pattern)
- **Auth Components**: `src/components/auth/*` (LoginForm, RegisterForm, AuthModal, etc.)
- **Agent Components**: `src/components/agent/*` (AgentDetector, AgentStatus, AgentDiscountBadge)
- **Crypto Components**: `src/components/crypto/*` (CryptoPaymentModal, CryptoPaymentForm)
- **Cart Components**: `src/components/cart/*` (CartIcon, CartItem)

### Provider Nesting Order

From `src/components/ClientProviders.tsx`:

```
SessionProvider (NextAuth)
  └─ WagmiProvider
      └─ QueryClientProvider
          └─ LanguageProvider
              └─ ShopProvider
                  └─ MetaMaskAuthProvider
                      └─ ShopifyApolloProvider
                          └─ CartProvider
                              └─ MetaMaskShopifyCartProvider
                                  └─ PriceGuaranteeProvider
```

**Initialization Components** (auto-run on mount):
- `<ExpiredItemCleanup />` - Removes expired price guarantees
- `<AuthInitializer />` - Checks auth status
- `<AgentDetector />` - Detects agent code from URL
- `<AuthModal />` - Global auth modal

### Important Files

- `src/middleware.ts` - Agent code validation (runs before route handlers)
- `src/lib/shopify/graphql-order-manager.ts` - Draft order creation with metafields
- `src/lib/crypto/wallet-manager.ts` - HD wallet address generation
- `src/contexts/CartContext.tsx` - Core cart logic (800+ lines)
- `src/stores/authStore.ts` - Zustand auth state with persistence

### Common Gotchas

1. **Multiple Auth Systems**: Don't assume user is authenticated in one system if they're authenticated in another
2. **Shopify Cart Sync**: Always wait for `syncWithShopify()` to complete before redirecting to checkout
3. **OrderID Atomicity**: Never generate orderID and payment address separately - use `generateCryptoPayment()`
4. **Agent Code Persistence**: Agent code is stored in both cookie (server) and localStorage (client)
5. **Price Guarantees**: Must be renewed if user modifies cart after initial ETH price lock

### Testing Endpoints

- `/test/alchemy` - Test Alchemy API connection
- `/test/shopify-permissions` - Verify Shopify Admin API permissions
- `/test-auth` - Test authentication flow

## Additional Documentation

See `docs/` directory for:
- `GOOGLE_AUTH_SETUP.md` - Google OAuth configuration
- `SHOPIFY_SETUP.md` - Shopify app setup
- `api/` - API specifications
- `database/` - Database schema (if migrating from localStorage)
- `security/` - Security requirements
