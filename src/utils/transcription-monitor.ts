import { EventEmitter } from 'events';

export interface TranscriptionStats {
  totalChunks: number;
  processedChunks: number;
  errors: number;
  startTime: number;
  lastChunkTime: number;
}

export interface TranscriptionEvents {
  started: { timestamp: number };
  timeout: { timeSinceLastChunk: number; threshold: number };
  progress: TranscriptionStats & { successRate: number; duration: number };
  stopped: TranscriptionStats & { successRate: number; duration: number };
  reset: { timestamp: number };
}

export interface TranscriptionMonitor {
  on<K extends keyof TranscriptionEvents>(
    event: K,
    listener: (arg: TranscriptionEvents[K]) => void
  ): this;
  emit<K extends keyof TranscriptionEvents>(
    event: K,
    arg: TranscriptionEvents[K]
  ): boolean;
  start(): void;
  stop(): TranscriptionStats & { successRate: number; duration: number };
  reset(): void;
  onChunkProcessed(success: boolean): void;
  getStats(): TranscriptionStats & { successRate: number; duration: number };
}

export class TranscriptionMonitor extends EventEmitter implements TranscriptionMonitor {
  private stats: TranscriptionStats;
  private readonly timeoutThreshold: number;
  private timeoutCheck: NodeJS.Timeout | null = null;

  constructor(timeoutThreshold = 5000) {
    super();
    this.timeoutThreshold = timeoutThreshold;
    this.stats = this.initializeStats();
  }

  private initializeStats(): TranscriptionStats {
    return {
      totalChunks: 0,
      processedChunks: 0,
      errors: 0,
      startTime: Date.now(),
      lastChunkTime: Date.now()
    };
  }

  public start(): void {
    this.stats = this.initializeStats();
    this.startTimeoutCheck();
    this.emit('started', { timestamp: this.stats.startTime });
  }

  private startTimeoutCheck(): void {
    this.timeoutCheck = setInterval(() => {
      const timeSinceLastChunk = Date.now() - this.stats.lastChunkTime;
      if (timeSinceLastChunk > this.timeoutThreshold) {
        this.emit('timeout', {
          timeSinceLastChunk,
          threshold: this.timeoutThreshold
        });
      }
    }, 1000);
  }

  public onChunkProcessed(success: boolean): void {
    this.stats.totalChunks++;
    this.stats.lastChunkTime = Date.now();
    
    if (success) {
      this.stats.processedChunks++;
    } else {
      this.stats.errors++;
    }

    this.emit('progress', {
      ...this.stats,
      successRate: this.getSuccessRate(),
      duration: this.getDuration()
    });
  }

  private getSuccessRate(): number {
    return this.stats.totalChunks === 0 ? 
      0 : 
      (this.stats.processedChunks / this.stats.totalChunks) * 100;
  }

  private getDuration(): number {
    return Date.now() - this.stats.startTime;
  }

  public getStats(): TranscriptionStats & { successRate: number; duration: number } {
    return {
      ...this.stats,
      successRate: this.getSuccessRate(),
      duration: this.getDuration()
    };
  }

  public stop(): TranscriptionStats & { successRate: number; duration: number } {
    if (this.timeoutCheck) {
      clearInterval(this.timeoutCheck);
      this.timeoutCheck = null;
    }

    const finalStats = this.getStats();
    this.emit('stopped', finalStats);
    return finalStats;
  }

  public reset(): void {
    this.stop();
    this.stats = this.initializeStats();
    this.emit('reset', { timestamp: Date.now() });
  }
} 