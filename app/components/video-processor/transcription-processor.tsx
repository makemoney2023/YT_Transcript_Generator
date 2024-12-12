'use client'

import { useState } from 'react'
import { TranscriptionRecorder } from '../audio-transcription/transcription-recorder'

export function TranscriptionProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const handleTranscriptionComplete = async (transcript: string) => {
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcription: transcript,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process transcription')
      }

      const result = await response.json()
      // Handle successful processing
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleYoutubeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsProcessing(true)
    setError(null)

    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          youtubeId: youtubeUrl,
        })
      })

      if (!response.ok) {
        throw new Error('Failed to process YouTube video')
      }

      const result = await response.json()
      setYoutubeUrl('') // Clear input after successful processing
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Audio Recording Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Record Audio</h2>
        <TranscriptionRecorder onTranscriptionComplete={handleTranscriptionComplete} />
      </div>

      {/* YouTube URL Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Process YouTube Video</h2>
        <form onSubmit={handleYoutubeSubmit} className="space-y-4">
          <div className="flex gap-4">
            <input
              type="text"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="Enter YouTube URL or ID"
              className="flex-1 px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !youtubeUrl}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Process Video
            </button>
          </div>
        </form>
      </div>
      
      {/* Status and Error Messages */}
      {isProcessing && (
        <div className="text-blue-500">Processing...</div>
      )}
      
      {error && (
        <div className="text-red-500">{error}</div>
      )}
    </div>
  )
} 