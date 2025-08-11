const nextConfig = {
  transpilePackages: ['@btc-wallet/ui'],
  webpack: (config: any) => {
    // Existing webpack config preserved
    return config;
  },
};

export default nextConfig;
