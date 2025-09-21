import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon } from 'wagmi/chains'
import { injected, metaMask } from 'wagmi/connectors'

const polygonAmoy = {
  id: 80002,
  name: 'Polygon Amoy',
  nativeCurrency: {
    decimals: 18,
    name: 'MATIC',
    symbol: 'MATIC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc-amoy.polygon.technology'],
    },
  },
  blockExplorers: {
    default: {
      name: 'PolygonScan',
      url: 'https://amoy.polygonscan.com',
    },
  },
  testnet: true,
} as const

export const wagmiConfig = createConfig({
  chains: [mainnet, sepolia, polygon, polygonAmoy],
  connectors: [
    injected(),
    metaMask(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
  },
})