# Technical Documentation

## Architecture Overview
The application uses an event-driven architecture with the following components:

### Core Components
1. **YouTube Downloader (youtube-mp3-downloader)**
   - Handles video downloads
   - Converts to MP3 format
   - Manages download progress events

2. **Transcription Service (Deepgram)**
   - Processes audio files
   - Generates text transcriptions
   - Handles API communication
   - Real-time WebSocket transcription

3. **File Management**
   - Temporary file storage
   - Cleanup procedures
   - Error handling

4. **Real-time Audio Processing**
   - Browser MediaStream API integration
   - Audio format conversion (Float32Array/Buffer to Int16Array)
   - WebSocket streaming
   - Real-time transcription updates

## Implementation Details

### Event System
The application uses Node.js event emitters and WebSocket events for:
- Download progress tracking
- Error handling
- Completion notifications
- Real-time audio streaming
- Live transcription updates

### File Processing Flow
1. Video download initiation
2. Progress monitoring
3. MP3 conversion
4. Transcription processing
5. File cleanup

### Real-time Processing Flow
1. Microphone stream initialization
2. Audio data capture and formatting
3. WebSocket connection establishment
4. Continuous audio streaming
5. Real-time transcription updates
6. Connection cleanup

### Error Handling
- Download failures
- Transcription errors
- File system errors
- API communication issues
- WebSocket connection errors
- Audio stream interruptions
- Microphone permission issues

## Performance Considerations
- Efficient file handling
- Memory management
- Resource cleanup
- Error recovery
- Audio buffer optimization
- WebSocket connection management
- Real-time data processing efficiency