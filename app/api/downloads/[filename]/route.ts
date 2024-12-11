import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs'

export async function GET(
  request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filePath = path.join(process.cwd(), 'downloads', params.filename)

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      )
    }

    // Read file
    const fileContent = fs.readFileSync(filePath, 'utf-8')

    // Return file content with proper headers
    return new NextResponse(fileContent, {
      headers: {
        'Content-Type': 'text/markdown',
        'Content-Disposition': `attachment; filename="${params.filename}"`,
      },
    })
  } catch (error) {
    console.error('Error serving file:', error)
    return NextResponse.json(
      { error: 'Failed to serve file' },
      { status: 500 }
    )
  }
} 