/**
 * @fileoverview Real-time audio transcription component using Deepgram's WebSocket API
 */

'use client'

import React, { useEffect, useState, useRef, useCallback } from 'react'
import type { Deepgram } from '@deepgram/sdk'
import MicrophoneStream from 'microphone-stream'
import { cn } from '@/lib/utils'

interface AudioChunk {
  chunkNumber: number;
  data: Float32Array;
}

interface DeepgramResponse {
  type: 'Results' | 'Error';
  channel: {
    alternatives: Array<{
      transcript: string;
      confidence: number;
    }>;
  };
  duration?: number;
  start?: number;
  is_final?: boolean;
  error?: string;
  message?: string;
}

interface TranscriptionRecorderProps {
  onTranscriptionComplete?: (transcript: string) => void;
}

interface MicrophoneStreamOptions {
  objectMode?: boolean;
  bufferSize?: number;
}

export default function TranscriptionRecorder({ onTranscriptionComplete }: TranscriptionRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<Error | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MicrophoneStream | null>(null);

  const handleError = (error: Error) => {
    console.error('Transcription error:', error);
    setError(error);
    stopRecording();
  };

  const processAudioData = (chunk: Buffer | Float32Array | AudioBuffer | any): ArrayBuffer => {
    let float32Array: Float32Array;
    
    // Handle different input types
    if (Buffer.isBuffer(chunk)) {
      // Handle Buffer input
      const view = new DataView(chunk.buffer);
      float32Array = new Float32Array(chunk.length / 4);
      for (let i = 0; i < float32Array.length; i++) {
        float32Array[i] = view.getFloat32(i * 4, true);
      }
    } else if (chunk instanceof Float32Array) {
      // Direct Float32Array input
      float32Array = chunk;
    } else if (chunk instanceof AudioBuffer) {
      // Handle AudioBuffer input - get the first channel data
      float32Array = chunk.getChannelData(0);
    } else if (Array.isArray(chunk)) {
      // Handle array input
      float32Array = new Float32Array(chunk);
    } else if (chunk.getChannelData) {
      // Alternative way to handle AudioBuffer-like objects
      try {
        float32Array = chunk.getChannelData(0);
      } catch (e) {
        console.warn('Failed to get channel data:', e);
        float32Array = new Float32Array(0);
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

    // Check audio levels without using reduce
    let sum = 0;
    let maxAbs = 0;
    for (let i = 0; i < float32Array.length; i++) {
      const absValue = Math.abs(float32Array[i]);
      sum += absValue;
      if (absValue > maxAbs) maxAbs = absValue;
    }
    const average = sum / float32Array.length;

    // Log audio levels for debugging
    console.log('Audio levels:', {
      average,
      maxAmplitude: maxAbs,
      samplesCount: float32Array.length
    });

    // Convert Float32Array to Int16Array for Deepgram
    const int16Array = new Int16Array(float32Array.length);
    
    // Apply normalization and convert to Int16
    const normalizeScale = maxAbs > 0 ? 0.7 / maxAbs : 1; // Use 0.7 to prevent clipping
    for (let i = 0; i < float32Array.length; i++) {
      // Scale to Int16 range with headroom
      int16Array[i] = Math.round(float32Array[i] * normalizeScale * 32767);
    }

    // Count non-zero samples and find range
    let nonZeroCount = 0;
    let minSample = 0;
    let maxSample = 0;
    for (let i = 0; i < int16Array.length; i++) {
      if (int16Array[i] !== 0) nonZeroCount++;
      if (int16Array[i] < minSample) minSample = int16Array[i];
      if (int16Array[i] > maxSample) maxSample = int16Array[i];
    }

    // Only send if we have actual audio data
    if (nonZeroCount === 0 || maxAbs < 0.0001) {
      console.warn('Skipping silent audio chunk');
      return new ArrayBuffer(0);
    }

    console.log(`Processed audio chunk:
      - Size: ${int16Array.buffer.byteLength} bytes
      - Samples: ${int16Array.length}
      - Non-zero samples: ${nonZeroCount}
      - Sample range: ${minSample} to ${maxSample}
      - Original max amplitude: ${maxAbs}
      - Normalization scale: ${normalizeScale}`
    );

    return int16Array.buffer;
  };

  const stopRecording = async () => {
    try {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      if (micStreamRef.current) {
        micStreamRef.current.stop();
        micStreamRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      setIsRecording(false);
      if (onTranscriptionComplete) {
        onTranscriptionComplete(transcript);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const startRecording = async () => {
    try {
      setIsRecording(true);
      setTranscript('');
      setInterimTranscript('');
      setError(null);

      // Create AudioContext first
      const audioContext = new AudioContext({
        sampleRate: 16000,
        latencyHint: 'interactive'
      });

      // Request microphone access with specific constraints
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      streamRef.current = stream;

      // Create and configure microphone stream
      const micStream = new MicrophoneStream({
        objectMode: true,
        bufferSize: 4096,
        context: audioContext
      });
      micStream.setStream(stream);
      micStreamRef.current = micStream;

      const apiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      if (!apiKey) {
        throw new Error('Deepgram API key is not configured');
      }

      // Create WebSocket URL with parameters
      const wsUrl = new URL('wss://api.deepgram.com/v1/listen');
      wsUrl.searchParams.append('encoding', 'linear16');
      wsUrl.searchParams.append('sample_rate', '16000');
      wsUrl.searchParams.append('channels', '1');
      wsUrl.searchParams.append('language', 'en-US');
      wsUrl.searchParams.append('model', 'nova-2');
      wsUrl.searchParams.append('punctuate', 'true');
      wsUrl.searchParams.append('interim_results', 'true');
      wsUrl.searchParams.append('version', 'latest');

      // Create WebSocket connection
      const ws = new WebSocket(wsUrl.toString(), ['token', apiKey]);
      ws.binaryType = 'arraybuffer';

      ws.onopen = () => {
        console.log('WebSocket connection opened');
        wsRef.current = ws;

        // Process audio data
        micStream.on('data', (chunk: any) => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              const buffer = processAudioData(chunk);
              if (buffer.byteLength > 0) {
                ws.send(buffer);
              }
            } catch (error) {
              console.error('Error processing audio chunk:', error);
            }
          }
        });
      };

      ws.onmessage = (message) => {
        try {
          const data = JSON.parse(message.data) as DeepgramResponse;
          console.log('Raw Deepgram response:', JSON.stringify(data, null, 2));

          if (data.type === 'Error') {
            handleError(new Error(data.message || 'Unknown Deepgram error'));
            return;
          }

          // Check if we have transcription data
          if (data.type === 'Results') {
            // Access the transcript from the correct path
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            
            if (transcript) {
              console.log(`Processing ${data.is_final ? 'final' : 'interim'} transcript:`, transcript);
              
              if (data.is_final) {
                setTranscript((prev) => {
                  const updatedTranscript = prev ? `${prev} ${transcript}` : transcript;
                  console.log('Updated final transcript:', updatedTranscript);
                  return updatedTranscript.trim();
                });
                setInterimTranscript('');
              } else {
                console.log('Setting interim transcript:', transcript);
                setInterimTranscript(transcript);
              }
            } else {
              // Log more details about why we didn't get a transcript
              console.log('No transcript found. Response structure:', {
                hasChannel: Boolean(data.channel),
                hasAlternatives: Boolean(data.channel?.alternatives),
                alternativesLength: data.channel?.alternatives?.length,
                firstAlternative: data.channel?.alternatives?.[0]
              });
            }
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
          handleError(error instanceof Error ? error : new Error('Failed to parse transcription response'));
        }
      };

      ws.onerror = (error) => {
        handleError(new Error('WebSocket error occurred'));
      };

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event);
        if (isRecording) {
          stopRecording();
        }
      };

    } catch (error) {
      handleError(error instanceof Error ? error : new Error('Failed to start recording'));
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={cn(
            "px-4 py-2 rounded-md font-medium transition-colors",
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          )}
        >
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error.message}
        </div>
      )}

      <div className="space-y-4">
        {/* Recording status */}
        {isRecording && (
          <div className="text-sm text-gray-500">
            Recording in progress...
          </div>
        )}

        {/* Interim results - always show when recording */}
        <div className="bg-gray-50 p-4 rounded-md border border-gray-200 min-h-[60px]">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Real-time Transcription</h3>
          <p className="text-gray-700 italic">
            {interimTranscript || (isRecording ? "Listening..." : "Start recording to see real-time transcription")}
          </p>
        </div>

        {/* Final transcript */}
        <div className="bg-white p-4 rounded-md border border-gray-200 min-h-[100px]">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Final Transcript</h3>
          <p className="text-gray-900 whitespace-pre-wrap">
            {transcript || "No transcription yet. Start recording to begin."}
          </p>
        </div>
      </div>
    </div>
  );
} 