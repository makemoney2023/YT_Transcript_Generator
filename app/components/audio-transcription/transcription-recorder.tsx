/**
 * @fileoverview Real-time audio transcription component using Deepgram's WebSocket API
 * @packageDocumentation
 */

'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import type { Deepgram } from '@deepgram/sdk'
import MicrophoneStream from 'microphone-stream'
import { cn } from '@/lib/utils'

/**
 * WebSocket status codes
 */
const enum WebSocketStatus {
  NORMAL_CLOSURE = 1000,
  GOING_AWAY = 1001,
}

/**
 * WebSocket configuration
 * @readonly
 */
const WS_CONFIG = {
  /** Keep-alive interval in milliseconds */
  KEEP_ALIVE_INTERVAL: 10000,
  /** Maximum reconnection attempts */
  MAX_RECONNECT_ATTEMPTS: 5,
  /** Reconnection delay in milliseconds */
  RECONNECT_DELAY: 1000,
  /** Maximum time without activity before reconnect */
  MAX_IDLE_TIME: 30000,
  /** Interval for checking connection activity */
  ACTIVITY_CHECK_INTERVAL: 5000,
} as const;

/**
 * Audio configuration
 * @readonly
 */
const AUDIO_CONFIG = {
  /** Sample rate for audio capture (Hz) */
  SAMPLE_RATE: 16000,
  /** Number of audio channels (1 for mono) */
  CHANNELS: 1,
  /** Size of audio processing buffer */
  BUFFER_SIZE: 4096,
  /** Minimum audio level to consider non-silent */
  MIN_AUDIO_LEVEL: 0.0001,
  /** Normalization scale factor to prevent clipping */
  NORMALIZATION_FACTOR: 0.7,
  /** Maximum value for 16-bit audio */
  MAX_INT16: 32767,
} as const;

type AudioConfig = typeof AUDIO_CONFIG;
type WSConfig = typeof WS_CONFIG;

/**
 * Audio processing options
 */
interface AudioProcessingOptions {
  /** Whether to normalize audio levels */
  normalize?: boolean;
  /** Whether to skip silent chunks */
  skipSilence?: boolean;
}

/**
 * Alternative transcription with confidence score
 */
interface TranscriptionAlternative {
  /** Transcribed text */
  transcript: string;
  /** Confidence score (0-1) */
  confidence: number;
  /** Individual word timings */
  words?: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
    punctuated_word: string;
  }>;
}

/**
 * Channel data containing transcription alternatives
 */
interface TranscriptionChannel {
  /** Array of alternative transcriptions */
  alternatives: TranscriptionAlternative[];
}

/**
 * Deepgram WebSocket response message
 */
interface DeepgramResponse {
  /** Message type ('Results' or 'Error') */
  type: 'Results' | 'Error';
  /** Transcription channel data */
  channel: TranscriptionChannel;
  /** Duration of audio processed (seconds) */
  duration?: number;
  /** Start time of transcription (seconds) */
  start?: number;
  /** Whether this is a final transcription */
  is_final?: boolean;
  /** Whether speech has ended */
  speech_final?: boolean;
  /** Error message if type is 'Error' */
  error?: string;
  /** Additional error details */
  message?: string;
  /** Metadata about the request */
  metadata?: {
    request_id: string;
    model_info: {
      name: string;
      version: string;
      arch: string;
    };
    model_uuid: string;
  };
}

/**
 * Props for the TranscriptionRecorder component
 */
interface TranscriptionRecorderProps {
  /** Callback function called when transcription is complete */
  onTranscriptionComplete?: (transcript: string) => void;
  /** Optional className for styling */
  className?: string;
}

/**
 * Processes raw audio data into a format suitable for Deepgram's API
 */
const processAudioData = (
  chunk: Buffer | Float32Array | AudioBuffer | unknown,
  options: AudioProcessingOptions = { normalize: true, skipSilence: true }
): ArrayBuffer => {
  let float32Array: Float32Array;
  
  try {
    // Handle different input types
    if (Buffer.isBuffer(chunk)) {
      const view = new DataView(chunk.buffer);
      float32Array = new Float32Array(chunk.length / 4);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = view.getFloat32(i * 4, true);
      }
    } else if (chunk instanceof Float32Array) {
      float32Array = chunk;
    } else if (chunk instanceof AudioBuffer) {
      float32Array = chunk.getChannelData(0);
    } else if (Array.isArray(chunk)) {
      float32Array = new Float32Array(chunk);
    } else if (typeof chunk === 'object' && chunk !== null && 'getChannelData' in chunk) {
      try {
        float32Array = (chunk as AudioBuffer).getChannelData(0);
      } catch (e) {
        console.warn('Failed to get channel data:', e);
        return new ArrayBuffer(0);
      }
    } else {
      console.warn('Unexpected chunk type:', typeof chunk, chunk);
      return new ArrayBuffer(0);
    }

    // Ensure we have valid data
    if (!float32Array || float32Array.length === 0) {
      console.warn('No valid audio data to process');
      return new ArrayBuffer(0);
    }

    // Process audio levels
    let sum = 0;
    let maxAbs = 0;
    for (let i = 0; i < float32Array.length; i++) {
      const absValue = Math.abs(float32Array[i]);
      sum += absValue;
      if (absValue > maxAbs) maxAbs = absValue;
    }
    const average = sum / float32Array.length;

    // Skip silent chunks if enabled
    if (options.skipSilence && maxAbs < AUDIO_CONFIG.MIN_AUDIO_LEVEL) {
      console.debug('Skipping silent audio chunk');
      return new ArrayBuffer(0);
    }

    // Convert to Int16Array
    const int16Array = new Int16Array(float32Array.length);
    const normalizeScale = options.normalize ? 
      (maxAbs > 0 ? AUDIO_CONFIG.NORMALIZATION_FACTOR / maxAbs : 1) : 1;

    for (let i = 0; i < float32Array.length; i++) {
      int16Array[i] = Math.round(float32Array[i] * normalizeScale * AUDIO_CONFIG.MAX_INT16);
    }

    return int16Array.buffer;
  } catch (error) {
    console.error('Error processing audio data:', error);
    return new ArrayBuffer(0);
  }
};

/**
 * Sets up the WebSocket connection with Deepgram
 */
const setupWebSocket = (apiKey: string): WebSocket => {
  const wsUrl = new URL('wss://api.deepgram.com/v1/listen');
  wsUrl.searchParams.append('encoding', 'linear16');
  wsUrl.searchParams.append('sample_rate', AUDIO_CONFIG.SAMPLE_RATE.toString());
  wsUrl.searchParams.append('channels', AUDIO_CONFIG.CHANNELS.toString());
  wsUrl.searchParams.append('language', 'en-US');
  wsUrl.searchParams.append('model', 'nova-2');
  wsUrl.searchParams.append('punctuate', 'true');
  wsUrl.searchParams.append('interim_results', 'true');
  wsUrl.searchParams.append('version', 'latest');
  wsUrl.searchParams.append('endpointing', '500');
  wsUrl.searchParams.append('no_delay', 'true');

  console.log('Setting up WebSocket with URL:', wsUrl.toString());
  const ws = new WebSocket(wsUrl.toString(), ['token', apiKey]);
  ws.binaryType = 'arraybuffer';
  return ws;
};

/**
 * Sets up the audio capture stream
 */
const setupAudioStream = async (): Promise<MicrophoneStream> => {
  const audioContext = new AudioContext({
    sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
    latencyHint: 'interactive'
  });

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: {
      channelCount: AUDIO_CONFIG.CHANNELS,
      sampleRate: AUDIO_CONFIG.SAMPLE_RATE,
      sampleSize: 16,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true
    }
  });

  const micStream = new MicrophoneStream({
    objectMode: true,
    bufferSize: AUDIO_CONFIG.BUFFER_SIZE,
    context: audioContext
  });
  micStream.setStream(stream);

  return micStream;
};

type HandleErrorFunction = (error: Error) => void;
type AttemptReconnectFunction = () => Promise<void>;

/**
 * TranscriptionRecorder Component
 */
export default function TranscriptionRecorder({ 
  onTranscriptionComplete,
  className 
}: TranscriptionRecorderProps): React.ReactElement {
  // State management
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const finalTranscriptRef = useRef<string>('');

  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MicrophoneStream | null>(null);
  const keepAliveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isReconnectingRef = useRef<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const activityCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const handleErrorRef = useRef<HandleErrorFunction | null>(null);
  const attemptReconnectRef = useRef<AttemptReconnectFunction | null>(null);

  /**
   * Updates the last activity timestamp
   */
  const updateLastActivity = useCallback((): void => {
    lastActivityRef.current = Date.now();
  }, []);

  /**
   * Cleans up WebSocket resources
   */
  const cleanupWebSocket = useCallback((): void => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }

    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
      activityCheckIntervalRef.current = null;
    }

    if (wsRef.current) {
      console.log('Cleaning up WebSocket connection...');
      wsRef.current.onclose = null; // Prevent recursive reconnection
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Stops recording and cleans up resources
   */
  const stopRecording = useCallback(async (): Promise<void> => {
    try {
      setIsRecording(false);
      
      // Wait a bit longer for final transcriptions
      if (!isFinalized) {
        console.log('Waiting for final transcriptions...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      const finalTranscript = finalTranscriptRef.current;
      console.log('Final transcript to save:', finalTranscript);
      
      // Cleanup resources
      cleanupWebSocket();

      if (micStreamRef.current) {
        micStreamRef.current.stop();
        micStreamRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Only call onTranscriptionComplete if we have a valid transcript
      if (onTranscriptionComplete && finalTranscript.trim()) {
        console.log('Saving final transcript...');
        await onTranscriptionComplete(finalTranscript);
      } else {
        console.log('No valid transcript to save');
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    } finally {
      setIsFinalized(false); // Reset for next recording
    }
  }, [onTranscriptionComplete, isFinalized, cleanupWebSocket]);

  /**
   * Handles errors during recording and transcription
   */
  const handleError: HandleErrorFunction = useCallback((error: Error): void => {
    console.error('Transcription error:', error);
    setError(error);
    if (error.message.includes('WebSocket error')) {
      console.log('WebSocket error detected, attempting to reconnect...');
      attemptReconnectRef.current?.();
    } else {
      void stopRecording();
    }
  }, [stopRecording]);

  /**
   * Sends a keep-alive message to prevent connection timeout
   */
  const sendKeepAlive = useCallback((): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const keepAliveMessage = JSON.stringify({ type: 'KeepAlive' });
      console.debug('Sending keep-alive message');
      wsRef.current.send(keepAliveMessage);
      updateLastActivity();
    }
  }, [updateLastActivity]);

  /**
   * Sets up keep-alive interval
   */
  const setupKeepAlive = useCallback((): void => {
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
    }
    console.log('Setting up keep-alive interval');
    keepAliveIntervalRef.current = setInterval(sendKeepAlive, WS_CONFIG.KEEP_ALIVE_INTERVAL);
  }, [sendKeepAlive]);

  /**
   * Attempts to reconnect the WebSocket
   */
  const attemptReconnect: AttemptReconnectFunction = useCallback(async () => {
    if (isReconnectingRef.current || !isRecording) return;

    try {
      isReconnectingRef.current = true;
      reconnectAttemptsRef.current += 1;

      console.log(`Attempting to reconnect (${reconnectAttemptsRef.current}/${WS_CONFIG.MAX_RECONNECT_ATTEMPTS})...`);

      if (reconnectAttemptsRef.current > WS_CONFIG.MAX_RECONNECT_ATTEMPTS) {
        console.error('Max reconnection attempts reached');
        void stopRecording();
        return;
      }

      await new Promise(resolve => setTimeout(resolve, WS_CONFIG.RECONNECT_DELAY));

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) throw new Error('Deepgram API key is not configured');

      cleanupWebSocket();
      const ws = setupWebSocket(apiKey);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Reconnected successfully');
        setupKeepAlive();
        isReconnectingRef.current = false;
        reconnectAttemptsRef.current = 0;

        if (micStreamRef.current) {
          micStreamRef.current.on('data', (chunk: unknown) => {
            if (ws.readyState === WebSocket.OPEN) {
              try {
                const buffer = processAudioData(chunk);
                if (buffer.byteLength > 0) {
                  updateLastActivity();
                  ws.send(buffer);
                }
              } catch (error) {
                console.error('Error processing audio chunk:', error);
              }
            }
          });
        }
      };

      ws.onmessage = handleWebSocketMessage;
      ws.onerror = (event: Event) => handleErrorRef.current?.(new Error('WebSocket error occurred'));
      ws.onclose = handleWebSocketClose;

    } catch (error) {
      console.error('Reconnection failed:', error);
      isReconnectingRef.current = false;
      void stopRecording();
    }
  }, [isRecording, stopRecording, cleanupWebSocket, setupKeepAlive, updateLastActivity]);

  /**
   * Handles WebSocket close events
   */
  const handleWebSocketClose = useCallback((event: CloseEvent): void => {
    console.log('WebSocket closed:', {
      code: event.code,
      reason: event.reason || 'No reason provided',
      wasClean: event.wasClean,
      timestamp: new Date().toISOString()
    });

    cleanupWebSocket();

    if (isRecording && event.code !== WebSocketStatus.NORMAL_CLOSURE && event.code !== WebSocketStatus.GOING_AWAY) {
      console.log('Attempting to reconnect due to unexpected closure...');
      void attemptReconnectRef.current?.();
    } else {
      console.log('Clean closure or not recording, stopping...');
      void stopRecording();
    }
  }, [isRecording, cleanupWebSocket, stopRecording, attemptReconnectRef]);

  /**
   * Checks for WebSocket inactivity
   */
  const checkActivity = useCallback((): void => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;
    
    if (timeSinceLastActivity > WS_CONFIG.MAX_IDLE_TIME && wsRef.current?.readyState === WebSocket.OPEN) {
      console.log(`No activity for ${timeSinceLastActivity}ms, checking connection status...`);
      
      // Send a keep-alive message to check connection
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendKeepAlive();
      } else {
        console.log('Connection appears to be lost, attempting reconnect...');
        void attemptReconnectRef.current?.();
      }
    }
  }, [attemptReconnectRef, sendKeepAlive]);

  /**
   * Sets up activity monitoring
   */
  const setupActivityMonitoring = useCallback((): void => {
    if (activityCheckIntervalRef.current) {
      clearInterval(activityCheckIntervalRef.current);
    }
    activityCheckIntervalRef.current = setInterval(checkActivity, WS_CONFIG.MAX_IDLE_TIME / 2);
  }, [checkActivity]);

  /**
   * Handles WebSocket messages from Deepgram
   */
  const handleWebSocketMessage = useCallback((message: MessageEvent<string>): void => {
    try {
      updateLastActivity();
      const data = JSON.parse(message.data) as DeepgramResponse;
      
      if (data.type === 'Error') {
        console.error('Deepgram error received:', data.message);
        handleError(new Error(data.message || 'Unknown Deepgram error'));
        return;
      }

      if (data.type === 'Results') {
        const transcriptText = data.channel?.alternatives?.[0]?.transcript;
        const confidence = data.channel?.alternatives?.[0]?.confidence ?? 0;
        const duration = data.duration ?? 0;
        
        if (transcriptText && confidence > 0) {
          console.log(`Processing ${data.is_final ? 'final' : 'interim'} transcript:`, {
            text: transcriptText,
            confidence,
            duration,
            isFinal: data.is_final,
            speechFinal: data.speech_final
          });
          
          updateLastActivity();
          
          if (data.is_final) {
            setTranscript((prev: string) => {
              const updatedTranscript = prev ? `${prev} ${transcriptText}` : transcriptText;
              finalTranscriptRef.current = updatedTranscript.trim();
              return updatedTranscript.trim();
            });
            setInterimTranscript('');
            
            // Only finalize if speech_final is true
            if (data.speech_final) {
              console.log('Speech finalized by Deepgram, preparing to save transcript...');
              setIsFinalized(true);
              void stopRecording();
            }
          } else {
            setInterimTranscript(transcriptText);
          }
        }
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      handleError(error instanceof Error ? error : new Error('Failed to parse transcription response'));
    }
  }, [handleError, updateLastActivity, stopRecording]);

  /**
   * Starts the recording and transcription process
   */
  const startRecording = useCallback(async (): Promise<void> => {
    try {
      setIsRecording(true);
      setTranscript('');
      setInterimTranscript('');
      setError(null);
      reconnectAttemptsRef.current = 0;
      isReconnectingRef.current = false;
      lastActivityRef.current = Date.now();

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        throw new Error('Deepgram API key is not configured');
      }

      const micStream = await setupAudioStream();
      micStreamRef.current = micStream;

      const ws = setupWebSocket(apiKey);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connection opened');
        setupKeepAlive();
        setupActivityMonitoring();
        updateLastActivity();
        
        micStream.on('data', (chunk: unknown) => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              const buffer = processAudioData(chunk);
              if (buffer.byteLength > 0) {
                updateLastActivity();
                ws.send(buffer);
              }
            } catch (error) {
              console.error('Error processing audio chunk:', error);
            }
          }
        });
      };

      ws.onmessage = handleWebSocketMessage;
      ws.onerror = (event: Event) => {
        console.error('WebSocket error:', event);
        handleError(new Error('WebSocket error occurred'));
      };
      ws.onclose = handleWebSocketClose;

    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  }, [
    handleError,
    handleWebSocketMessage,
    handleWebSocketClose,
    setupKeepAlive,
    setupActivityMonitoring,
    updateLastActivity
  ]);

  // Store the functions in refs to break circular dependency
  useEffect(() => {
    handleErrorRef.current = handleError;
    attemptReconnectRef.current = attemptReconnect;
  }, [handleError, attemptReconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activityCheckIntervalRef.current) {
        clearInterval(activityCheckIntervalRef.current);
      }
      cleanupWebSocket();
      if (isRecording) {
        void stopRecording();
      }
    };
  }, [isRecording, stopRecording, cleanupWebSocket]);

  return (
    <div className={cn("space-y-4 p-4", className)}>
      <div className="flex items-center justify-between">
        <button
          onClick={() => void (isRecording ? stopRecording() : startRecording())}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-colors",
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          )}
          type="button"
          aria-label={isRecording ? "Stop Recording" : "Start Recording"}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md" role="alert">
          {error.message}
        </div>
      )}

      <div className="space-y-4">
        {isRecording && (
          <div className="text-sm text-gray-500" aria-live="polite">
            Recording in progress...
          </div>
        )}

        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 min-h-[60px]">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Real-time Transcription</h3>
          <p className="text-gray-700 italic" aria-live="polite">
            {interimTranscript || (isRecording ? "Listening..." : "Start recording to see real-time transcription")}
          </p>
        </div>

        <div className="bg-white p-4 rounded-md border border-gray-200 min-h-[100px]">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Final Transcript</h3>
          <p className="text-gray-900 whitespace-pre-wrap" aria-live="polite">
            {transcript || "No transcription yet. Start recording to begin."}
          </p>
        </div>
      </div>
    </div>
  );
} 