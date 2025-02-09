"use client"

import Link from "next/link"
import { Suspense } from "react"
import { ErrorBoundary } from 'react-error-boundary'
import AIAcademicIcon from "../components/AIAcademicIcon"
import ChatWithParams from "../components/ChatWithParams"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Something went wrong with the chat!</h2>
        <p className="text-gray-600">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

export default function ChatPage() {
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
          <ErrorBoundary FallbackComponent={ErrorFallback}>
            <Suspense fallback={<div>Loading...</div>}>
              <ChatWithParams />
            </Suspense>
          </ErrorBoundary>
        </div>
      </main>
    </div>
  )
} 