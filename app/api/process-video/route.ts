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
    const { youtubeId, transcription } = await request.json()

    if (!youtubeId && !transcription) {
      return NextResponse.json(
        { error: 'YouTube video ID or transcription is required' },
        { status: 400 }
      )
    }

    if (youtubeId) {
      const videoPath = path.join(downloadsDir, 'temp.mp4')
      const audioPath = path.join(downloadsDir, 'temp.mp3')

      try {
        console.log('Starting video processing...')

        // Check if video already exists
        if (videoExists(youtubeId)) {
          const existingVideo = getVideo(youtubeId)
          return NextResponse.json(existingVideo)
        }

        console.log('Getting video info...')
        let videoUrl = youtubeId.includes('youtube.com') || youtubeId.includes('youtu.be')
          ? youtubeId
          : `https://www.youtube.com/watch?v=${youtubeId}`

        let videoInfo: any
        try {
          videoInfo = await ytdl.getInfo(videoUrl)
          videoInfo = {
            videoDetails: {
              title: videoInfo.videoDetails.title,
              lengthSeconds: videoInfo.videoDetails.lengthSeconds,
              author: videoInfo.videoDetails.author?.name || 'Unknown',
              viewCount: videoInfo.videoDetails.viewCount,
              thumbnails: videoInfo.videoDetails.thumbnails
            }
          }
        } catch (error) {
          console.log('ytdl.getInfo failed, trying play-dl...', error)
          const info = await video_info(videoUrl)
          videoInfo = {
            videoDetails: {
              title: info.video_details.title || 'Untitled Video',
              lengthSeconds: info.video_details.durationInSec.toString(),
              author: info.video_details.channel?.name || 'Unknown',
              viewCount: info.video_details.views?.toString(),
              thumbnails: info.video_details.thumbnails
            }
          }
        }

        const videoTitle = videoInfo.videoDetails.title
        const markdownFileName = `${videoTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`
        const markdownPath = path.join(downloadsDir, markdownFileName)

        console.log('Downloading video...')
        await downloadVideo(videoUrl, videoPath)

        console.log('Converting to MP3...')
        await convertToMp3(videoPath, audioPath)

        console.log('Reading audio file...')
        const audioFile = {
          buffer: fs.readFileSync(audioPath),
          mimetype: 'audio/mp3',
        }

        console.log('Sending to Deepgram...')
        const response = await deepgram.transcription.preRecorded(
          { buffer: audioFile.buffer, mimetype: audioFile.mimetype },
          {
            punctuate: true,
            utterances: true,
            version: "latest"
          }
        )

        const transcript = response.results?.channels[0]?.alternatives[0]?.transcript || ''

        console.log('Creating markdown content...')
        const markdownContent = `# ${videoTitle}\n\n## Metadata\n- Duration: ${
          new Date(parseInt(videoInfo.videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8)
        }\n- Author: ${videoInfo.videoDetails.author}\n- Views: ${
          parseInt(videoInfo.videoDetails.viewCount || '0').toLocaleString()
        }\n\n## Transcript\n\n${transcript}`
        
        console.log('Saving markdown file...')
        fs.writeFileSync(markdownPath, markdownContent)

        console.log('Cleaning up temporary files...')
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath)
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)

        // Create video record
        const videoRecord: VideoRecord = {
          id: youtubeId,
          url: videoUrl,
          title: videoTitle,
          duration: new Date(parseInt(videoInfo.videoDetails.lengthSeconds) * 1000).toISOString().substr(11, 8),
          markdownFile: markdownFileName,
          createdAt: new Date().toISOString(),
          thumbnailUrl: videoInfo.videoDetails.thumbnails?.[0]?.url || null,
          views: videoInfo.videoDetails.viewCount?.toString() || '0',
          author: videoInfo.videoDetails.author
        }

        // Save to storage
        addVideo(videoRecord)

        console.log('Processing complete!')
        return NextResponse.json(videoRecord)
      } catch (error) {
        console.error('Error in POST handler:', error)
        // Clean up any leftover files
        if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath)
        if (fs.existsSync(audioPath)) fs.unlinkSync(audioPath)
        
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'An unknown error occurred'
        
        return NextResponse.json(
          { error: errorMessage },
          { status: 500 }
        )
      }
    } else if (transcription) {
      console.log('Processing transcription...')

      const markdownFileName = `transcription_${Date.now()}.md`
      const markdownPath = path.join(process.cwd(), 'downloads', markdownFileName)

      const markdownContent = `# Transcription Result\n\n${transcription}`

      fs.writeFileSync(markdownPath, markdownContent)

      console.log('Transcription saved as', markdownFileName)

      return NextResponse.json({ message: 'Transcription processed successfully' })
    }
  } catch (error) {
    console.error('Error in POST handler:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An error occurred' },
      { status: 500 }
    )
  }
} 