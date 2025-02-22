"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { ErrorBoundary } from 'react-error-boundary'
import ChatInterface from "./ChatInterface"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <h3 className="text-lg font-medium text-red-800">Chat Error</h3>
      <p className="text-sm text-red-600">{error.message}</p>
      <button
        onClick={resetErrorBoundary}
        className="mt-2 px-3 py-1 text-sm bg-red-100 text-red-800 rounded hover:bg-red-200"
      >
        Try Again
      </button>
    </div>
  )
}

interface ChatWithParamsProps {
  chatId?: string;
  isNewChat?: boolean;
  onNewChatSubmit?: (message: string) => Promise<{ content: string; chat_id: string; }>;
  isSidebarOpen?: boolean;
}

export default function ChatWithParams({ chatId, isNewChat, onNewChatSubmit, isSidebarOpen }: ChatWithParamsProps) {
  const searchParams = useSearchParams()
  const [initialMessage, setInitialMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      const message = searchParams.get('message')
      if (message && !initialMessage) {
        setInitialMessage(message)
      }
    } catch (error) {
      console.error('Error processing search params:', error)
    }
  }, [searchParams, initialMessage])

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <ChatInterface 
        startInChatMode={true}
        initialMessage={initialMessage}
        currentChatId={chatId}
        isNewChat={isNewChat}
        onNewChatSubmit={onNewChatSubmit}
        isSidebarOpen={isSidebarOpen}
      />
    </ErrorBoundary>
  )
} 