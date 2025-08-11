const nextConfig = {
  transpilePackages: ['@btc-wallet/ui'],
  webpack: (config: any) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
    });
    return config;
  },
};

export default nextConfig;
