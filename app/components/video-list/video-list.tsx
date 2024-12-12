'use client'

import { useEffect, useState } from 'react'
import type { VideoRecord } from '@/types/video-record'

export function VideoList() {
  const [videos, setVideos] = useState<VideoRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        const response = await fetch('/api/videos')
        if (!response.ok) throw new Error('Failed to fetch videos')
        const data = await response.json()
        setVideos(data)
      } catch (error) {
        setError('Failed to load videos')
        console.error('Error fetching videos:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchVideos()
  }, [])

  if (loading) {
    return <div className="text-gray-500">Loading videos...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Processed Videos</h2>
      {videos.length === 0 ? (
        <p className="text-gray-500">No videos processed yet.</p>
      ) : (
        <div className="grid gap-4">
          {videos.map((video) => (
            <div key={video.id} className="border rounded-lg p-4 flex gap-4 bg-white shadow-sm">
              {video.thumbnailUrl && (
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-32 h-24 object-cover rounded"
                />
              )}
              <div className="flex-1">
                <h3 className="font-medium">{video.title}</h3>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>Duration: {video.duration}</p>
                  <p>Processed: {new Date(video.createdAt).toLocaleString()}</p>
                </div>
                <div className="mt-2">
                  <a
                    href={`/downloads/${video.markdownFile}`}
                    className="text-blue-500 hover:text-blue-600 text-sm font-medium"
                    download
                  >
                    Download Transcript
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 