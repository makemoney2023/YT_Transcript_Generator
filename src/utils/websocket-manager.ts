import { WebSocket, RawData } from 'ws';
import { EventEmitter } from 'events';

interface WebSocketManagerConfig {
  url: string;
  maxRetries?: number;
  retryDelay?: number;
}

export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private retryCount = 0;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private readonly url: string;
  private isClosing = false;

  constructor(config: WebSocketManagerConfig) {
    super();
    this.url = config.url;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);
      this.setupEventListeners();
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private setupEventListeners() {
    if (!this.ws) return;

    this.ws.on('open', () => {
      this.retryCount = 0;
      this.emit('connected');
    });

    this.ws.on('message', (data: RawData) => {
      try {
        const parsed = JSON.parse(data.toString());
        this.emit('message', parsed);
      } catch (error) {
        this.handleError(new Error('Failed to parse WebSocket message'));
      }
    });

    this.ws.on('error', (error: Error) => {
      this.handleError(error);
    });

    this.ws.on('close', () => {
      if (!this.isClosing) {
        this.handleReconnect();
      }
      this.emit('disconnected');
    });
  }

  private handleError(error: Error) {
    this.emit('error', error);
    console.error('[WebSocket Error]:', error.message);
  }

  private handleReconnect() {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      setTimeout(() => {
        console.log(`Attempting reconnection ${this.retryCount}/${this.maxRetries}`);
        this.connect();
      }, this.retryDelay);
    } else {
      this.emit('maxRetriesReached');
    }
  }

  send(data: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }
    try {
      this.ws.send(JSON.stringify(data));
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  close() {
    this.isClosing = true;
    if (this.ws) {
      this.ws.close();
    }
  }
} 