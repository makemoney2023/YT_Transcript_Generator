import { EventEmitter } from 'events';

interface AudioProcessorConfig {
  sampleRate: number;
  channelCount: number;
  sampleSize: number;
  bufferSize: number;
}

declare global {
  interface Window {
    AudioContext: typeof AudioContext;
    webkitAudioContext: typeof AudioContext;
  }
}

const AudioContextClass = typeof window !== 'undefined' 
  ? (window.AudioContext || window.webkitAudioContext)
  : null;

export class AudioProcessor extends EventEmitter {
  private readonly config: AudioProcessorConfig;
  private stream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private processor: ScriptProcessorNode | null = null;

  constructor(config: AudioProcessorConfig) {
    super();
    this.config = this.validateConfig(config);
  }

  private validateConfig(config: AudioProcessorConfig): AudioProcessorConfig {
    if (!AudioContextClass) {
      throw new Error('AudioContext is not supported in this environment');
    }
    if (config.sampleRate !== 16000) {
      throw new Error('Sample rate must be 16000Hz for Deepgram compatibility');
    }
    if (config.channelCount !== 1) {
      throw new Error('Only mono audio is supported');
    }
    if (config.sampleSize !== 16) {
      throw new Error('Sample size must be 16-bit');
    }
    return config;
  }

  async start() {
    try {
      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this environment');
      }

      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: this.config.channelCount,
          sampleRate: this.config.sampleRate,
          sampleSize: this.config.sampleSize
        }
      });

      this.audioContext = new AudioContextClass({
        sampleRate: this.config.sampleRate,
        latencyHint: 'interactive'
      });

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.processor = this.audioContext.createScriptProcessor(
        this.config.bufferSize,
        this.config.channelCount,
        this.config.channelCount
      );

      this.processor.onaudioprocess = this.handleAudioProcess.bind(this);
      source.connect(this.processor);
      this.processor.connect(this.audioContext.destination);

      this.emit('started');
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private handleAudioProcess(event: AudioProcessingEvent) {
    try {
      const inputData = event.inputBuffer.getChannelData(0);
      const audioData = this.convertFloat32ToInt16(inputData);
      this.emit('audioData', audioData);
    } catch (error) {
      this.handleError(new Error('Audio processing failed'));
    }
  }

  private convertFloat32ToInt16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return int16Array;
  }

  private handleError(error: Error) {
    this.emit('error', error);
    console.error('[Audio Processor Error]:', error.message);
    this.stop();
  }

  stop() {
    try {
      if (this.processor) {
        this.processor.disconnect();
        this.processor = null;
      }
      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
      this.emit('stopped');
    } catch (error) {
      this.handleError(error as Error);
    }
  }
} 