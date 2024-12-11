import fs from 'fs'
import path from 'path'
import { VideoRecord } from '../types/video-record'

const STORAGE_FILE = path.join(process.cwd(), 'data', 'videos.json')

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data')
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true })
}

// Initialize storage file if it doesn't exist
if (!fs.existsSync(STORAGE_FILE)) {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify({ videos: [] }, null, 2))
}

export function getAllVideos(): VideoRecord[] {
  try {
    const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'))
    return data.videos
  } catch (error) {
    console.error('Error reading videos:', error)
    return []
  }
}

export function addVideo(video: VideoRecord): void {
  try {
    const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'))
    data.videos = [video, ...data.videos]
    fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2))
  } catch (error) {
    console.error('Error adding video:', error)
    throw error
  }
}

export function getVideo(id: string): VideoRecord | null {
  try {
    const data = JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf-8'))
    return data.videos.find((v: VideoRecord) => v.id === id) || null
  } catch (error) {
    console.error('Error getting video:', error)
    return null
  }
}

export function videoExists(id: string): boolean {
  return getVideo(id) !== null
} 