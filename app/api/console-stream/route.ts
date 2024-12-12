import { NextResponse } from 'next/server';

export async function GET() {
  const encoder = new TextEncoder();
  let isStreamClosed = false;

  const customReadable = new ReadableStream({
    start(controller) {
      // Store original console methods
      const originalLog = console.log;
      const originalError = console.error;
      const originalInfo = console.info;

      // Helper function to safely enqueue messages
      const safeEnqueue = (message: any) => {
        if (!isStreamClosed) {
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
          } catch (error) {
            // If we hit an error enqueueing, close the stream
            try {
              controller.close();
            } catch (_) {
              // Ignore close errors
            }
            isStreamClosed = true;
          }
        }
      };

      // Override console methods
      console.log = (...args) => {
        originalLog.apply(console, args);
        safeEnqueue({
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'info',
        });
      };

      console.error = (...args) => {
        originalError.apply(console, args);
        safeEnqueue({
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'error',
        });
      };

      console.info = (...args) => {
        originalInfo.apply(console, args);
        safeEnqueue({
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'success',
        });
      };
    },
    cancel() {
      isStreamClosed = true;
    },
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 