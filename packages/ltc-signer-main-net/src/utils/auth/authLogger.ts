export const authLogger = {
  debug: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔐 ${message}`, data);
    }
  },
  info: (message: string, data?: unknown) => {
    console.info(`🔐 ${message}`, data);
  },
  error: (message: string, error?: Error) => {
    console.error(`🔐 ${message}`, error);
  },
  warn: (message: string, data?: unknown) => {
    console.warn(`🔐 ${message}`, data);
  },
  performance: (operation: string, duration: number) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`⏱️ ${operation} took ${duration.toFixed(2)}ms`);
    }
  },
};
