"use client"

import { useSearchParams } from "next/navigation"
import { Suspense, useEffect, useState } from "react"
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

// Inner component that uses searchParams
function ChatWithParamsContent({ chatId, isNewChat, onNewChatSubmit, isSidebarOpen }: ChatWithParamsProps) {
  const searchParams = useSearchParams()
  const [initialMessage, setInitialMessage] = useState<string | null>(null)

  useEffect(() => {
    try {
      if (searchParams) {
        const message = searchParams.get('message')
        if (message && !initialMessage) {
          setInitialMessage(message)
        }
      }
    } catch (error) {
      console.error('Error getting message from URL:', error)
    }
  }, [searchParams, initialMessage])

  return (
    <ChatInterface 
      startInChatMode={true}
      initialMessage={initialMessage}
      currentChatId={chatId}
      isNewChat={isNewChat}
      onNewChatSubmit={onNewChatSubmit}
      isSidebarOpen={isSidebarOpen}
    />
  )
}

export default function ChatWithParams(props: ChatWithParamsProps) {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense fallback={<div className="p-4">Loading chat...</div>}>
        <ChatWithParamsContent {...props} />
      </Suspense>
    </ErrorBoundary>
  )
} 