import { unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { EventEmitter } from 'events';

interface FileManagerConfig {
  tempDir: string;
  maxAge: number; // Maximum age of temp files in milliseconds
  cleanupInterval: number; // Cleanup interval in milliseconds
}

interface CleanupStats {
  timestamp: number;
  activeFiles: number;
  deletedFiles?: number;
}

export class FileManager extends EventEmitter {
  private readonly config: FileManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private activeFiles: Set<string> = new Set();

  constructor(config: FileManagerConfig) {
    super();
    this.config = config;
    this.startCleanupInterval();
  }

  private startCleanupInterval() {
    this.cleanupInterval = setInterval(
      () => this.cleanup(),
      this.config.cleanupInterval
    );
  }

  async registerFile(filePath: string) {
    try {
      const fullPath = join(this.config.tempDir, filePath);
      this.activeFiles.add(fullPath);
      this.emit('fileRegistered', { path: fullPath });
      return fullPath;
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async releaseFile(filePath: string) {
    try {
      const fullPath = join(this.config.tempDir, filePath);
      this.activeFiles.delete(fullPath);
      await this.safeDelete(fullPath);
      this.emit('fileReleased', { path: fullPath });
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async safeDelete(filePath: string) {
    try {
      await unlink(filePath);
      this.emit('fileDeleted', { path: filePath });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        this.handleError(error as Error);
      }
    }
  }

  private async cleanup() {
    try {
      const files = await readdir(this.config.tempDir);
      const now = Date.now();
      let deletedFiles = 0;

      for (const file of files) {
        const filePath = join(this.config.tempDir, file);
        
        // Skip active files
        if (this.activeFiles.has(filePath)) {
          continue;
        }

        try {
          const stats = await stat(filePath);
          const age = now - stats.mtime.getTime();

          if (age > this.config.maxAge) {
            await this.safeDelete(filePath);
            deletedFiles++;
          }
        } catch (error) {
          // Ignore errors for individual files
          console.warn(`Failed to process file ${file}:`, error);
        }
      }

      const cleanupStats: CleanupStats = {
        timestamp: now,
        activeFiles: this.activeFiles.size,
        deletedFiles
      };
      
      this.emit('cleanupComplete', cleanupStats);
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleError(error: Error) {
    this.emit('error', error);
    console.error('[File Manager Error]:', error.message);
  }

  async stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    // Final cleanup of all files
    const files = Array.from(this.activeFiles);
    for (const file of files) {
      await this.safeDelete(file);
    }
    this.activeFiles.clear();

    this.emit('stopped');
  }
} 