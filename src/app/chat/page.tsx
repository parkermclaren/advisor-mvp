"use client"

import Link from "next/link"
import { Suspense } from "react"
import { ErrorBoundary } from 'react-error-boundary'
import ChatWithParams from "../components/ChatWithParams"

function ErrorFallback({ error, resetErrorBoundary }: { error: Error, resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
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
    <div className="min-h-screen relative bg-gradient-to-br from-deep-blue/25 via-deep-blue/15 to-deep-blue/30">
      {/* Multiple radial gradients for depth and distribution */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,54,93,0.45),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(26,54,93,0.3),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(26,54,93,0.35),transparent_40%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_85%,rgba(76,175,80,0.1),transparent_45%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_60%,rgba(76,175,80,0.08),transparent_50%)]" />
      
      {/* Content layer */}
      <div className="relative">
        {/* Header with back button */}
        <header className="bg-white/25 backdrop-blur-xl border-b border-white/50 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
          <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
            <Link 
              href="/" 
              className="text-deep-blue hover:opacity-80 transition-opacity"
            >
              <span className="font-['Fraunces'] text-2xl">Academic Advisor</span>
            </Link>
          </div>
        </header>

        {/* Main chat area */}
        <main className="max-w-4xl mx-auto px-4 py-6">
          <div className="h-[calc(100vh-8rem)]">
            <div className="h-full bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <Suspense fallback={<div className="p-8">Loading...</div>}>
                  <ChatWithParams />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
} 