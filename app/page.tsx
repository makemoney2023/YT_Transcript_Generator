'use client'

import React from 'react'
import { ConsoleSidebar } from './components/console-sidebar'
import { TranscriptionProcessor } from './components/video-processor/transcription-processor'
import { VideoList } from './components/video-list/video-list'

export default function Home() {
  return (
    <main className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Audio & Video Transcription</h1>
      <div className="flex">
        <div className="flex-1 pr-80">
          <TranscriptionProcessor />
          <VideoList />
        </div>
        <ConsoleSidebar />
      </div>
    </main>
  )
} 