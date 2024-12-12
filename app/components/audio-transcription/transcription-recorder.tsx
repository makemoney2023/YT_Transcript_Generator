/**
 * @fileoverview Real-time audio transcription component using Deepgram's WebSocket API
 */

'use client'

import { useState, useRef } from 'react'
import type { Deepgram } from '@deepgram/sdk'
import type MicrophoneStream from 'microphone-stream'

/**
 * Response structure from Deepgram WebSocket API
 */
interface DeepgramResponse {
  type: 'Results' | 'Error' | 'Metadata'
  channel?: {
    alternatives?: Array<{
      transcript?: string
    }>
  }
  error?: unknown
  message?: string
  description?: string
}

/**
 * Props for the TranscriptionRecorder component
 */
interface TranscriptionRecorderProps {
  /** Callback function called when recording stops with the final transcript */
  onTranscriptionComplete: (transcript: string) => void
}

/**
 * A component that handles real-time audio transcription using Deepgram's API.
 * Features:
 * - Real-time audio recording using the browser's MediaStream API
 * - WebSocket connection to Deepgram for live transcription
 * - Support for both Buffer and Float32Array audio formats
 * - Error handling and connection state management
 * 
 * @param props - Component props
 * @returns A React component for audio recording and transcription
 */
export function TranscriptionRecorder({ onTranscriptionComplete }: TranscriptionRecorderProps) {
  // State for recording status and transcript
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  
  // Refs for maintaining WebSocket and MicrophoneStream instances
  const micStreamRef = useRef<MicrophoneStream | null>(null)
  const dgSocketRef = useRef<WebSocket | null>(null)

  /**
   * Starts the recording process:
   * 1. Gets microphone permissions
   * 2. Sets up audio stream
   * 3. Connects to Deepgram WebSocket
   * 4. Begins sending audio data
   */
  const startRecording = async () => {
    try {
      // Get microphone permission and start stream
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          sampleSize: 16
        } 
      })
      
      console.log('Microphone stream started:', {
        tracks: mediaStream.getAudioTracks().map(track => ({
          label: track.label,
          settings: track.getSettings()
        }))
      });
      
      // Dynamically import MicrophoneStream to avoid SSR issues
      const { default: MicStream } = await import('microphone-stream')
      micStreamRef.current = new MicStream({
        objectMode: true,
        bufferSize: 4096
      })

      console.log('MicrophoneStream created with settings:', {
        objectMode: true,
        bufferSize: 4096
      });

      micStreamRef.current.setStream(mediaStream)

      // Initialize Deepgram socket
      const response = await fetch('/api/get-deepgram-token')
      const { token, projectId } = await response.json()
      
      console.log('Got Deepgram token:', token)
      
      // Create WebSocket connection with all parameters in URL
      const wsUrl = `wss://api.deepgram.com/v1/listen?` +
        `encoding=linear16&` +
        `sample_rate=16000&` +
        `language=en-US&` +
        `model=nova-2&` +
        `punctuate=true&` +
        `interim_results=true`;
      
      console.log('Connecting to Deepgram WebSocket:', wsUrl);
      
      const socket = new WebSocket(wsUrl, ['token', token]);

      // Add error logging for connection issues
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        console.log('WebSocket state at error:', {
          readyState: socket.readyState,
          bufferedAmount: socket.bufferedAmount,
          protocol: socket.protocol,
          url: socket.url
        });
      });

      dgSocketRef.current = socket;

      let isFirstChunk = true;
      let chunkCount = 0;

      socket.addEventListener('open', () => {
        console.log('WebSocket connection opened');
        
        // Start sending audio data
        if (micStreamRef.current) {
          micStreamRef.current.on('data', (chunk: Buffer | Float32Array) => {
            if (socket.readyState === WebSocket.OPEN) {
              try {
                // Log only the first chunk and every 100th chunk to avoid console spam
                if (isFirstChunk || chunkCount % 100 === 0) {
                  console.log('Audio chunk received:', {
                    chunkNumber: chunkCount,
                    chunkType: chunk instanceof Buffer ? 'Buffer' : 'Float32Array',
                    chunkLength: chunk.length,
                    bufferAvailable: chunk instanceof Buffer ? chunk.buffer ? 'yes' : 'no' : 'n/a',
                    sampleData: Array.from(chunk).slice(0, 5)
                  });
                  isFirstChunk = false;
                }
                chunkCount++;

                // Convert the chunk to Int16Array
                let audioData: Int16Array;
                
                if (chunk instanceof Buffer) {
                  audioData = new Int16Array(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength));
                } else if (chunk instanceof Float32Array) {
                  audioData = new Int16Array(chunk.length);
                  for (let i = 0; i < chunk.length; i++) {
                    const s = Math.max(-1, Math.min(1, chunk[i]));
                    audioData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
                  }
                } else {
                  console.error('Unexpected chunk type:', typeof chunk);
                  return;
                }

                if (isFirstChunk || chunkCount % 100 === 0) {
                  console.log('Sending audio data:', {
                    chunkNumber: chunkCount,
                    dataType: 'Int16Array',
                    length: audioData.length,
                    sampleValues: Array.from(audioData.slice(0, 5))
                  });
                }

                socket.send(audioData.buffer);
              } catch (error) {
                console.error('Error processing audio chunk:', error);
              }
            }
          });

          setIsRecording(true);
        } else {
          console.error('MicrophoneStream is not initialized');
          socket.close();
        }
      });

      socket.addEventListener('message', (message) => {
        try {
          // Parse and type-check the incoming message
          const data = JSON.parse(message.data) as DeepgramResponse;
          console.log('Received message:', data);
          
          if (data.type === 'Results') {
            // Extract transcript from the results
            const transcript = data.channel?.alternatives?.[0]?.transcript || '';
            if (transcript) {
              console.log('New transcript segment:', transcript);
              // Append new transcript segment with a space
              setTranscript((prev) => prev + ' ' + transcript);
            }
          } else if (data.type === 'Error') {
            // Log any errors from Deepgram
            console.error('Deepgram error:', {
              error: data.error,
              message: data.message,
              description: data.description
            });
          } else if (data.type === 'Metadata') {
            // Log metadata messages (connection info, etc.)
            console.log('Deepgram metadata:', data);
          }
        } catch (error) {
          console.error('Error parsing message:', error);
          console.log('Raw message data:', message.data);
        }
      });

      // Handle WebSocket errors
      socket.addEventListener('error', (error) => {
        console.error('WebSocket error:', error);
        console.log('WebSocket state:', {
          readyState: socket.readyState,
          bufferedAmount: socket.bufferedAmount,
          protocol: socket.protocol,
          url: socket.url
        });
        console.log('Project ID:', projectId);
        
        // Clean up on error
        if (micStreamRef.current) {
          micStreamRef.current.stop();
        }
        setIsRecording(false);
      });

      // Handle WebSocket closure
      socket.addEventListener('close', (event) => {
        console.log('WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        
        // Clean up resources
        if (micStreamRef.current) {
          micStreamRef.current.stop();
        }
        setIsRecording(false);
      });
    } catch (err) {
      console.error('Error starting recording:', err)
    }
  }

  /**
   * Stops the recording process:
   * 1. Stops and cleans up the microphone stream
   * 2. Closes the WebSocket connection
   * 3. Calls the completion callback with the final transcript
   */
  const stopRecording = async () => {
    if (micStreamRef.current) {
      micStreamRef.current.stop()
      micStreamRef.current = null
    }

    if (dgSocketRef.current) {
      dgSocketRef.current.close()
      dgSocketRef.current = null
    }

    setIsRecording(false)
    onTranscriptionComplete(transcript)
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`px-4 py-2 rounded-lg ${
              isRecording 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
            } text-white`}
          >
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </button>
          <div className={`w-3 h-3 rounded-full ${
            isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'
          }`} />
        </div>
        
        <div className="min-h-[100px] p-4 bg-gray-50 rounded-lg">
          {transcript || 'Transcript will appear here...'}
        </div>
      </div>
    </div>
  )
} 