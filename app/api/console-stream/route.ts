import { NextResponse } from 'next/server';

export async function GET() {
  const encoder = new TextEncoder();
  const customReadable = new ReadableStream({
    start(controller) {
      // Intercept console.log and other console methods
      const originalLog = console.log;
      const originalError = console.error;
      const originalInfo = console.info;

      console.log = (...args) => {
        originalLog.apply(console, args);
        const message = {
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'info',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };

      console.error = (...args) => {
        originalError.apply(console, args);
        const message = {
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'error',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };

      console.info = (...args) => {
        originalInfo.apply(console, args);
        const message = {
          timestamp: new Date().toISOString(),
          message: args.join(' '),
          type: 'success',
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };
    },
  });

  return new NextResponse(customReadable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
} 