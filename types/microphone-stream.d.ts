declare module 'microphone-stream' {
  import { Transform } from 'stream'

  class MicrophoneStream extends Transform {
    constructor(opts?: any)
    setStream(stream: MediaStream): void
    stop(): void
    on(event: string, handler: (chunk: Buffer) => void): void
  }

  export = MicrophoneStream
} 