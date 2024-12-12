import { NextResponse } from 'next/server'
import { Deepgram } from '@deepgram/sdk'

// Type assertion for environment variables
const DG_KEY = process.env.DG_KEY as string
const DG_PROJECT_ID = process.env.DG_PROJECT_ID as string

// Validate environment variables at runtime
if (!process.env.DG_KEY) {
  throw new Error('DG_KEY environment variable is not set')
}

if (!process.env.DG_PROJECT_ID) {
  throw new Error('DG_PROJECT_ID environment variable is not set')
}

// Initialize Deepgram with proper typing
const deepgram = new Deepgram(DG_KEY)

export async function GET() {
  try {
    // Return the API key directly for WebSocket authentication
    return NextResponse.json({ 
      token: DG_KEY,
      projectId: DG_PROJECT_ID
    })
  } catch (error) {
    console.error('Error creating Deepgram token:', error)
    return NextResponse.json(
      { error: 'Failed to create Deepgram token', details: error },
      { status: 500 }
    )
  }
} 