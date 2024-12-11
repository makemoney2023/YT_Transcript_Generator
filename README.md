# YouTube MP3 Downloader & Transcriber

A Node.js application that downloads YouTube videos as MP3 files and generates text transcriptions using Deepgram's AI transcription service.

## Overview
This application allows you to:
- Download YouTube videos as MP3 files
- Generate text transcriptions using Deepgram
- Track download progress
- Automatically clean up temporary files

## Prerequisites
- Node.js (v14 or higher)
- FFmpeg installed
- Deepgram API key

## Quick Start
1. Clone the repository
2. Create a `.env` file with your Deepgram API key:
   ```
   DG_KEY=your_deepgram_api_key_here
   ```
3. Install dependencies:
   ```
   npm install
   ```
4. Run the application:
   ```
   node index.js
   ```

## Configuration
The application uses the following environment variables:
- `DG_KEY`: Your Deepgram API key

## Features
- YouTube video downloading with progress tracking
- MP3 conversion using FFmpeg
- Speech-to-text transcription via Deepgram
- Automatic file cleanup
- Error handling and logging

## Troubleshooting
Common issues and solutions:
- If downloads fail, check your YouTube video ID
- Ensure FFmpeg is properly installed
- Verify your Deepgram API key is valid
- Check file permissions in the output directory

## License
[Add your license information here]
