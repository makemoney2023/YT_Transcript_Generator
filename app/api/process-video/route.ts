import { NextResponse } from 'next/server'
import path from 'path'
import { Deepgram } from '@deepgram/sdk'
import fs from 'fs'
import { exec } from 'child_process'
import ffmpeg from 'ffmpeg-static'
import { promisify } from 'util'
import { stream as playDlStream, video_info, YouTubeVideo, setToken } from 'play-dl'
import ytdl from 'ytdl-core'
import { addVideo, videoExists, getVideo } from '../../../utils/video-storage'
import type { VideoRecord } from '../../../types/video-record'

interface VideoInfo {
  videoDetails: {
    title: string;
    videoId: string;
    lengthSeconds: string;
  };
}

const execAsync = promisify(exec)

// Check if DG_KEY exists
const dgKey = process.env.DG_KEY
if (!dgKey) {
  throw new Error('DG_KEY environment variable is not set')
}

const deepgram = new Deepgram(dgKey)

// Ensure downloads directory exists
const downloadsDir = path.join(process.cwd(), 'downloads')
if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true })
}

// Get the ffmpeg path from ffmpeg-static
const ffmpegPath = path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe')

// Verify ffmpeg exists
if (!fs.existsSync(ffmpegPath)) {
  throw new Error(`FFmpeg not found at path: ${ffmpegPath}`)
}

async function convertToMp3(inputPath: string, outputPath: string): Promise<void> {
  try {
    // Ensure input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`)
    }

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Construct the command with proper path escaping
    const command = `"${ffmpegPath}" -i "${inputPath}" -vn -ab 128k -ar 44100 -y "${outputPath}"`
    console.log('Running ffmpeg command:', command)
    
    const { stdout, stderr } = await execAsync(command)
    if (stderr) {
      console.warn('FFmpeg stderr:', stderr)
    }
    if (stdout) {
      console.log('FFmpeg stdout:', stdout)
    }

    // Verify the output file was created
    if (!fs.existsSync(outputPath)) {
      throw new Error('FFmpeg did not create output file')
    }
  } catch (error) {
    console.error('FFmpeg error:', error)
    throw new Error(`FFmpeg conversion failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function downloadWithYtdl(url: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const stream = ytdl(url, {
        quality: 'highestaudio',
        filter: 'audioonly',
      })
      const writeStream = fs.createWriteStream(outputPath)
      
      stream.pipe(writeStream)
      stream.on('error', reject)
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    } catch (error) {
      reject(error)
    }
  })
}

async function downloadWithPlayDl(url: string, outputPath: string): Promise<void> {
  try {
    const playDlResult = await playDlStream(url)
    return new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath)
      playDlResult.stream.pipe(writeStream)
      writeStream.on('finish', resolve)
      writeStream.on('error', reject)
    })
  } catch (error) {
    throw new Error(`play-dl download failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

async function downloadVideo(url: string, outputPath: string): Promise<void> {
  const errors: Error[] = []

  // Try ytdl-core first
  try {
    console.log('Attempting download with ytdl-core...')
    await downloadWithYtdl(url, outputPath)
    return
  } catch (error) {
    console.log('ytdl-core failed:', error instanceof Error ? error.message : 'Unknown error')
    if (error instanceof Error) {
      errors.push(error)
    } else {
      errors.push(new Error('Unknown ytdl-core error'))
    }
  }

  // Try play-dl as fallback
  try {
    console.log('Attempting download with play-dl...')
    await downloadWithPlayDl(url, outputPath)
    return
  } catch (error) {
    console.log('play-dl failed:', error instanceof Error ? error.message : 'Unknown error')
    if (error instanceof Error) {
      errors.push(error)
    } else {
      errors.push(new Error('Unknown play-dl error'))
    }
  }

  // If all methods fail, throw a comprehensive error
  throw new Error(`All download methods failed:\n${errors.map(e => e.message).join('\n')}`)
}

export async function POST(request: Request) {
  try {
    const { transcription } = await request.json()

    if (!transcription?.trim()) {
      return NextResponse.json(
        { error: 'Transcription is required' },
        { status: 400 }
      )
    }

    // Create downloads directory if it doesn't exist
    const downloadsDir = path.join(process.cwd(), 'downloads')
    if (!fs.existsSync(downloadsDir)) {
      fs.mkdirSync(downloadsDir, { recursive: true })
    }

    // Create the markdown file
    const filename = `transcription_${Date.now()}.md`
    const markdownPath = path.join(downloadsDir, filename)
    const markdownContent = `# Transcription Result\n\n${transcription}`

    fs.writeFileSync(markdownPath, markdownContent)
    console.log('Transcription saved to:', filename)

    return NextResponse.json({ 
      success: true,
      filename,
      message: 'Transcription processed successfully' 
    })
  } catch (error) {
    console.error('Error processing transcription:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process transcription' },
      { status: 500 }
    )
  }
} 