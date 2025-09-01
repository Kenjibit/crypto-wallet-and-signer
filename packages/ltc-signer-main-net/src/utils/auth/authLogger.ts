/**
 * Authentication Logger Utility
 * Provides structured logging for authentication-related events
 */

export interface AuthLogger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, data?: unknown) => void;
  performance: (message: string, data?: unknown) => void;
}

class AuthLoggerImpl implements AuthLogger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  debug(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log(`🔍 [Auth Debug] ${message}`, data || '');
    }
  }

  info(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log(`ℹ️ [Auth Info] ${message}`, data || '');
    }
  }

  warn(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.warn(`⚠️ [Auth Warn] ${message}`, data || '');
    }
  }

  error(message: string, data?: unknown): void {
    // Always log errors, even in production
    console.error(`🚨 [Auth Error] ${message}`, data || '');
  }

  performance(message: string, data?: unknown): void {
    if (this.isDevelopment) {
      console.log(`⚡ [Auth Performance] ${message}`, data || '');
    }
  }
}

export const authLogger = new AuthLoggerImpl();
