# API Documentation

## Deepgram Integration

### Setup
```javascript
const deepgram = new Deepgram(process.env.DG_KEY)
```

### WebSocket Configuration
```typescript
const wsUrl = `wss://api.deepgram.com/v1/listen?` +
  `encoding=linear16&` +     // 16-bit linear PCM
  `sample_rate=16000&` +     // 16kHz sample rate
  `language=en-US&` +        // English language
  `model=nova-2&` +          // Deepgram's latest model
  `punctuate=true&` +        // Add punctuation
  `interim_results=true`;    // Get real-time partial results
```

### Audio Configuration
```typescript
// MediaStream constraints
{
  audio: {
    channelCount: 1,    // Mono audio
    sampleRate: 16000,  // 16kHz sample rate
    sampleSize: 16      // 16-bit audio
  }
}

// MicrophoneStream settings
{
  objectMode: true,   // Get audio as Buffer/Float32Array
  bufferSize: 4096    // Buffer size in bytes
}
```

### Configuration Options
- `punctuate`: Enables punctuation in transcriptions
- `mimetype`: Set to 'audio/mp3' for file processing
- `encoding`: Set to 'linear16' for real-time audio
- `sample_rate`: Audio sample rate (16000Hz recommended)
- `language`: Target language for transcription
- `model`: Deepgram model selection
- Buffer handling for both file and stream processing

### YouTube MP3 Downloader

#### Configuration
```javascript
{
  ffmpegPath: string,
  outputPath: string,
  youtubeVideoQuality: string
}
```

#### Events
- `progress`: Download progress updates
- `error`: Error handling
- `finished`: Download completion

### WebSocket Events
- `open`: Connection established
- `message`: Transcription updates
  - Results: Contains transcript segments
  - Error: Processing or connection issues
  - Metadata: Connection information
- `error`: WebSocket errors
- `close`: Connection termination

### Response Handling
- File transcription results processing
- Real-time transcription updates
- Error management
- Connection state management
- Resource cleanup procedures

## Security Considerations
- API key protection
- Input validation
- Error handling best practices
- WebSocket connection security
- Microphone permission handling