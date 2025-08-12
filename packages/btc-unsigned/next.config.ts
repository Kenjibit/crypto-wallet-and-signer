const nextConfig = {
  transpilePackages: ['@btc-wallet/ui', '@btc-wallet/my-pwa'],
  webpack: (config: any) => {
    // Existing webpack config preserved
    return config;
  },
};

export default nextConfig;
