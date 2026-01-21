/**
 * Event bus for component communication
 * Enables decoupled pub/sub pattern across extension components
 */

type EventHandler<T = any> = (data: T) => void;

class EventBus {
  private listeners: Map<string, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(handler);

    // Return unsubscribe function
    return () => this.off(event, handler);
  }

  /**
   * Subscribe to an event (one-time)
   */
  once<T = any>(event: string, handler: EventHandler<T>): void {
    const wrappedHandler = (data: T) => {
      handler(data);
      this.off(event, wrappedHandler);
    };

    this.on(event, wrappedHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off(event: string, handler: EventHandler): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<T = any>(event: string, data?: T): void {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Clear all listeners for an event
   */
  clear(event?: string): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get count of listeners for an event
   */
  listenerCount(event: string): number {
    return this.listeners.get(event)?.size || 0;
  }
}

// Singleton instance
export const eventBus = new EventBus();

// Make available globally for cross-context communication
if (typeof window !== 'undefined') {
  (window as any).eventBus = eventBus;
}
