"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import AIAcademicIcon from "../components/AIAcademicIcon"
import ChatInterface from "../components/ChatInterface"

export default function ChatPage() {
  const searchParams = useSearchParams()
  const [initialMessage, setInitialMessage] = useState<string | null>(null)

  useEffect(() => {
    const message = searchParams.get('message')
    if (message && !initialMessage) {
      setInitialMessage(message)
    }
  }, [searchParams, initialMessage])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header with back button */}
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-deep-blue hover:opacity-80 transition-opacity"
          >
            <AIAcademicIcon className="w-8 h-8" />
            <span className="font-serif text-xl">Academic Advisor</span>
          </Link>
        </div>
      </header>

      {/* Main chat area */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="h-[calc(100vh-8rem)]">
          <ChatInterface startInChatMode={true} initialMessage={initialMessage} />
        </div>
      </main>
    </div>
  )
} 