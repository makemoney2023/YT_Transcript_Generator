import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const token = process.env.DG_KEY
    if (!token) {
      return NextResponse.json({ error: 'Deepgram API key is not configured' }, { status: 500 })
    }
    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error fetching Deepgram token:', error)
    return NextResponse.json({ error: 'Failed to fetch Deepgram token' }, { status: 500 })
  }
} 