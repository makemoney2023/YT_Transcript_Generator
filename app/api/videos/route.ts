import { NextResponse } from 'next/server'
import { getAllVideos } from '@/utils/video-storage'

export async function GET() {
  try {
    const videos = getAllVideos()
    return NextResponse.json(videos)
  } catch (error) {
    console.error('Error fetching videos:', error)
    return NextResponse.json(
      { error: 'Failed to fetch videos' },
      { status: 500 }
    )
  }
} 