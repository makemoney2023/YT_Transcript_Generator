'use client';

import * as React from 'react';
import { useEffect, useState } from 'react';
import { ScrollArea } from "./ui/scroll-area";

interface ConsoleMessage {
  timestamp: string;
  message: string;
  type: 'info' | 'error' | 'success';
}

export function ConsoleSidebar() {
  const [messages, setMessages] = useState<ConsoleMessage[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  useEffect(() => {
    let eventSource: EventSource;

    const connectEventSource = () => {
      if (retryCount >= MAX_RETRIES) {
        console.error('Max retries reached for EventSource connection');
        return;
      }

      eventSource = new EventSource('/api/console-stream');

      eventSource.onmessage = (event) => {
        const message = JSON.parse(event.data);
        setMessages((prev) => [...prev, message]);
      };

      eventSource.onerror = (error) => {
        console.error('EventSource failed:', error);
        eventSource.close();
        setRetryCount(prev => prev + 1);
        setTimeout(connectEventSource, 1000 * Math.min(retryCount + 1, 5));
      };
    };

    connectEventSource();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [retryCount]);

  return (
    <div className="w-80 h-screen bg-gray-900 text-white p-4 fixed right-0 top-0 border-l border-gray-800">
      <h2 className="text-lg font-semibold mb-4">Console Output</h2>
      <ScrollArea className="h-[calc(100vh-8rem)]">
        <div className="space-y-2">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-2 rounded text-sm font-mono ${
                msg.type === 'error'
                  ? 'bg-red-900/50'
                  : msg.type === 'success'
                  ? 'bg-green-900/50'
                  : 'bg-gray-800/50'
              }`}
            >
              <span className="text-xs text-gray-400">{msg.timestamp}</span>
              <pre className="whitespace-pre-wrap break-words">{msg.message}</pre>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
} 