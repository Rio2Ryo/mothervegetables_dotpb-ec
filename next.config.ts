import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Turbopackを無効化 */
  experimental: {
    turbo: undefined
  },
  webpack: (config, { isServer }) => {
    // React Native依存関係を無視
    config.resolve.fallback = {
      ...config.resolve.fallback,
      '@react-native-async-storage/async-storage': false,
    };
    
    // サーバーサイドでのみReact Native依存関係を無視
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('@react-native-async-storage/async-storage');
    }
    
    return config;
  }
};

export default nextConfig;
