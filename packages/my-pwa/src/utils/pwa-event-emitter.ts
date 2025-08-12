// PWA Event Emitter
import { PWAEventEmitter, PWALifecycleEvent } from '../types';

/**
 * PWA Event Emitter Implementation
 * Provides event management for PWA lifecycle events
 */
export class PWAEventEmitterImpl implements PWAEventEmitter {
  private events: Map<string, Set<(...args: any[]) => void>> = new Map();
  private onceEvents: Map<string, Set<(...args: any[]) => void>> = new Map();

  /**
   * Register an event listener
   */
  on(event: string, callback: (...args: any[]) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);
  }

  /**
   * Register a one-time event listener
   */
  once(event: string, callback: (...args: any[]) => void): void {
    if (!this.onceEvents.has(event)) {
      this.onceEvents.set(event, new Set());
    }
    this.onceEvents.get(event)!.add(callback);
  }

  /**
   * Remove an event listener
   */
  off(event: string, callback: (...args: any[]) => void): void {
    this.events.get(event)?.delete(callback);
    this.onceEvents.get(event)?.delete(callback);
  }

  /**
   * Emit an event to all listeners
   */
  emit(event: string, ...args: any[]): void {
    // Emit to regular listeners
    const listeners = this.events.get(event);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }

    // Emit to once listeners and remove them
    const onceListeners = this.onceEvents.get(event);
    if (onceListeners) {
      onceListeners.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in once event listener for ${event}:`, error);
        }
      });
      onceListeners.clear();
    }
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners(event?: string): void {
    if (event) {
      this.events.delete(event);
      this.onceEvents.delete(event);
    } else {
      this.events.clear();
      this.onceEvents.clear();
    }
  }

  /**
   * Get the number of listeners for a specific event
   */
  listenerCount(event: string): number {
    const regularCount = this.events.get(event)?.size || 0;
    const onceCount = this.onceEvents.get(event)?.size || 0;
    return regularCount + onceCount;
  }

  /**
   * Get all registered event names
   */
  eventNames(): string[] {
    const regularEvents = Array.from(this.events.keys());
    const onceEvents = Array.from(this.onceEvents.keys());
    return [...new Set([...regularEvents, ...onceEvents])];
  }

  /**
   * Check if an event has any listeners
   */
  hasListeners(event: string): boolean {
    return this.listenerCount(event) > 0;
  }
}

/**
 * PWA Lifecycle Event Manager
 * Specialized event manager for PWA lifecycle events
 */
export class PWALifecycleEventManager extends PWAEventEmitterImpl {
  private lifecycleEvents: Set<PWALifecycleEvent> = new Set([
    'install-prompt-shown',
    'install-prompt-accepted',
    'install-prompt-dismissed',
    'app-installed',
    'service-worker-registered',
    'service-worker-updated',
    'offline',
    'online',
    'cache-updated',
    'background-sync-completed',
    'push-notification-received',
    'notification-clicked',
  ]);

  /**
   * Emit a PWA lifecycle event
   */
  emitLifecycleEvent(event: PWALifecycleEvent, data?: any): void {
    if (this.lifecycleEvents.has(event)) {
      this.emit(event, data);

      // Also emit a generic lifecycle event
      this.emit('lifecycle', { event, data, timestamp: new Date() });

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`PWA Lifecycle Event: ${event}`, data);
      }
    } else {
      console.warn(`Unknown PWA lifecycle event: ${event}`);
    }
  }

  /**
   * Get all registered lifecycle events
   */
  getLifecycleEvents(): PWALifecycleEvent[] {
    return Array.from(this.lifecycleEvents);
  }

  /**
   * Check if an event is a valid lifecycle event
   */
  isLifecycleEvent(event: string): event is PWALifecycleEvent {
    return this.lifecycleEvents.has(event as PWALifecycleEvent);
  }

  /**
   * Subscribe to all lifecycle events
   */
  onAllLifecycleEvents(
    callback: (event: PWALifecycleEvent, data?: any) => void
  ): void {
    this.lifecycleEvents.forEach((event) => {
      this.on(event, callback);
    });
  }

  /**
   * Unsubscribe from all lifecycle events
   */
  offAllLifecycleEvents(
    callback: (event: PWALifecycleEvent, data?: any) => void
  ): void {
    this.lifecycleEvents.forEach((event) => {
      this.off(event, callback);
    });
  }
}

/**
 * PWA Event Bus
 * Global event bus for PWA applications
 */
export class PWAEventBus extends PWALifecycleEventManager {
  private static instance: PWAEventBus;
  private customEvents: Set<string> = new Set();

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PWAEventBus {
    if (!PWAEventBus.instance) {
      PWAEventBus.instance = new PWAEventBus();
    }
    return PWAEventBus.instance;
  }

  /**
   * Register a custom event
   */
  registerCustomEvent(eventName: string): void {
    this.customEvents.add(eventName);
  }

  /**
   * Unregister a custom event
   */
  unregisterCustomEvent(eventName: string): void {
    this.customEvents.delete(eventName);
  }

  /**
   * Get all custom events
   */
  getCustomEvents(): string[] {
    return Array.from(this.customEvents);
  }

  /**
   * Check if an event is a custom event
   */
  isCustomEvent(event: string): boolean {
    return this.customEvents.has(event);
  }

  /**
   * Emit a custom event
   */
  emitCustomEvent(event: string, data?: any): void {
    if (this.customEvents.has(event)) {
      this.emit(event, data);
    } else {
      console.warn(`Unregistered custom event: ${event}`);
    }
  }
}

/**
 * Create a new PWA event emitter
 */
export function createPWAEventEmitter(): PWAEventEmitter {
  return new PWAEventEmitterImpl();
}

/**
 * Create a new PWA lifecycle event manager
 */
export function createPWALifecycleEventManager(): PWALifecycleEventManager {
  return new PWALifecycleEventManager();
}

/**
 * Get the global PWA event bus
 */
export function getPWAEventBus(): PWAEventBus {
  return PWAEventBus.getInstance();
}

/**
 * PWA Event Decorators
 * Utility functions for common PWA event patterns
 */

/**
 * Debounce event emission
 */
export function debounceEvent(
  emitter: PWAEventEmitter,
  event: string,
  delay: number
): (...args: any[]) => void {
  let timeoutId: NodeJS.Timeout;

  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      emitter.emit(event, ...args);
    }, delay);
  };
}

/**
 * Throttle event emission
 */
export function throttleEvent(
  emitter: PWAEventEmitter,
  event: string,
  limit: number
): (...args: any[]) => void {
  let inThrottle: boolean;

  return (...args: any[]) => {
    if (!inThrottle) {
      emitter.emit(event, ...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Retry event emission with exponential backoff
 */
export function retryEvent(
  emitter: PWAEventEmitter,
  event: string,
  maxRetries: number = 3,
  baseDelay: number = 1000
): (...args: any[]) => void {
  let retryCount = 0;

  return (...args: any[]) => {
    const emitWithRetry = () => {
      try {
        emitter.emit(event, ...args);
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          const delay = baseDelay * Math.pow(2, retryCount - 1);
          setTimeout(emitWithRetry, delay);
        } else {
          console.error(
            `Failed to emit event ${event} after ${maxRetries} retries:`,
            error
          );
        }
      }
    };

    emitWithRetry();
  };
}
