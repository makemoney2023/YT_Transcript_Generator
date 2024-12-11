'use client'

import React, { useState, useEffect } from 'react'
import type { VideoRecord } from '../types/video-record'
import { ConsoleSidebar } from './components/console-sidebar'

export default function Home() {
  const [youtubeId, setYoutubeId] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [videos, setVideos] = useState<VideoRecord[]>([])

  // Fetch videos on mount
  useEffect(() => {
    fetchVideos()
  }, [])

  const fetchVideos = async () => {
    try {
      const response = await fetch('/api/videos')
      if (!response.ok) {
        throw new Error('Failed to fetch videos')
      }
      const data = await response.json()
      setVideos(data)
    } catch (error) {
      console.error('Error fetching videos:', error)
      setError('Failed to fetch videos')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/process-video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ youtubeId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video')
      }

      // Refresh videos list
      fetchVideos()
      
      // Clear input
      setYoutubeId('')
    } catch (error) {
      console.error('Error:', error)
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async (filename: string) => {
    try {
      const response = await fetch(`/api/downloads/${filename}`)
      
      if (!response.ok) {
        throw new Error('Failed to download file')
      }

      const text = await response.text()
      
      // Create blob and download
      const blob = new Blob([text], { type: 'text/markdown' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error downloading file:', error)
      setError('Failed to download the markdown file')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <div className="z-10 w-full items-center justify-between font-mono text-sm pr-80">
        <h1 className="text-4xl font-bold mb-8 text-center pt-8">YouTube Transcripts</h1>
        <p className="text-xl mb-8 text-center">Convert YouTube videos to transcripts using Deepgram</p>
        
        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-4 mb-8">
          <div className="flex flex-col space-y-2">
            <label htmlFor="youtubeId" className="text-sm font-medium">
              YouTube Video URL or ID
            </label>
            <input
              type="text"
              id="youtubeId"
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              placeholder="Enter YouTube URL or video ID"
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              required
            />
            <div className="text-xs text-gray-500 space-y-1">
              <p>Accepted formats:</p>
              <ul className="list-disc list-inside ml-2">
                <li>Full URL: https://www.youtube.com/watch?v=dQw4w9WgXcQ</li>
                <li>Short URL: https://youtu.be/dQw4w9WgXcQ</li>
                <li>Video ID: dQw4w9WgXcQ</li>
              </ul>
            </div>
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !youtubeId}
            className={`w-full px-4 py-2 text-white bg-blue-500 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              (isLoading || !youtubeId) && 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isLoading ? 'Processing...' : 'Generate Transcript'}
          </button>
        </form>

        {error && (
          <div className="w-full max-w-md mx-auto p-4 mb-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {videos.length > 0 && (
          <div className="w-full overflow-x-auto rounded-lg shadow-xl mb-8">
            <table className="min-w-full divide-y divide-gray-700 bg-gray-900/50 backdrop-blur-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">
                    Video
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">
                    Details
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">
                    Stats
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider w-1/4">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-gray-800/30 divide-y divide-gray-700">
                {videos.map((video) => (
                  <tr key={video.id}>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="flex items-center">
                        {video.thumbnailUrl && (
                          <img
                            src={video.thumbnailUrl}
                            alt={video.title}
                            className="h-20 w-36 object-cover rounded"
                          />
                        )}
                        <div className="ml-4">
                          <div className="text-sm font-medium text-white">
                            {video.title}
                          </div>
                          <div className="text-sm text-gray-400">
                            {typeof video.author === 'string' ? video.author : video.author?.name || 'Unknown'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="text-sm text-white">Duration: {video.duration}</div>
                      <div className="text-sm text-gray-400">
                        Added: {new Date(video.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal">
                      <div className="text-sm text-white">
                        {video.views ? `${parseInt(video.views).toLocaleString()} views` : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-normal text-right text-sm font-medium">
                      <button
                        onClick={() => handleDownload(video.markdownFile)}
                        className="text-blue-400 hover:text-blue-600"
                      >
                        Download Transcript
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConsoleSidebar />
    </main>
  )
} 