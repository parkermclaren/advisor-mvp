"use client"

import { PanelLeftOpen, Plus } from "lucide-react"
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from "react"
import { ErrorBoundary } from 'react-error-boundary'
import ChatSidebar from "../components/ChatSidebar"
import ChatWithParams from "../components/ChatWithParams"
import ProfileMenu from "../components/ProfileMenu"

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

// Wrap the chat page content in a client component that uses searchParams
function ChatPageContent() {
  const [currentChatId, setCurrentChatId] = useState<string>()
  const [isNewChat, setIsNewChat] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams) {
      const chatId = searchParams.get('id')
      if (chatId) {
        setCurrentChatId(chatId)
        setIsNewChat(false)
      }
    }
  }, [searchParams])

  const handleChatSelect = (chatId: string) => {
    setIsNewChat(false)
    setCurrentChatId(chatId)
  }

  const handleNewChat = () => {
    setCurrentChatId(undefined)
    setIsNewChat(true)
  }

  const handleToggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const handleNewChatSubmit = async (message: string) => {
    // Immediately transition to chat mode
    setIsNewChat(false)
    
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{ role: "User", content: message }]
        })
      });

      if (!response.ok) throw new Error("Failed to create chat");
      
      const data = await response.json();
      if (data.chat_id) {
        setCurrentChatId(data.chat_id)
        return data // Return the full response data
      }
    } catch (error) {
      console.error('Error creating new chat:', error)
      throw error // Propagate error to ChatInterface
    }
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-deep-blue/25 via-deep-blue/15 to-deep-blue/30">
      {/* Multiple radial gradients for depth and distribution */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,54,93,0.45),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(26,54,93,0.3),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(26,54,93,0.35),transparent_40%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_85%,rgba(76,175,80,0.1),transparent_45%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_60%,rgba(76,175,80,0.08),transparent_50%)]" />
      
      {/* Content layer */}
      <div className="relative h-screen px-6">
        <div className="flex h-full gap-6 overflow-hidden">
          {/* Sidebar */}
          <div className={`transition-all duration-300 ease-in-out ${
            isSidebarOpen 
              ? 'w-64 opacity-100 visible' 
              : 'w-0 opacity-0 invisible -ml-6'
          }`}>
            <ChatSidebar 
              currentChatId={currentChatId}
              onChatSelect={handleChatSelect}
              onNewChat={handleNewChat}
              isOpen={isSidebarOpen}
              onToggle={handleToggleSidebar}
            />
          </div>

          {/* Main content area */}
          <div className={`flex-1 relative h-[calc(100vh-3rem)] mt-6 transition-all duration-300 ease-in-out 
                        ${!isSidebarOpen ? 'ml-0' : ''}`}>
            {/* Top Bar with Sidebar Toggle when closed */}
            {!isSidebarOpen && (
              <div className="absolute top-4 left-4 z-50 flex items-center gap-2">
                <button
                  onClick={handleToggleSidebar}
                  className="p-2 bg-white/25 backdrop-blur-xl border border-white/50 rounded-xl 
                           shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] hover:bg-white/30 transition-colors"
                >
                  <PanelLeftOpen className="w-5 h-5 text-deep-blue" />
                </button>
                <button
                  onClick={handleNewChat}
                  className="p-2 bg-white/25 backdrop-blur-xl border border-white/50 rounded-xl 
                           shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] hover:bg-white/30 transition-colors"
                >
                  <Plus className="w-5 h-5 text-deep-blue" />
                </button>
              </div>
            )}

            {/* Profile Menu */}
            <div className="absolute top-4 right-4 z-50">
              <ProfileMenu />
            </div>

            {/* Main chat area */}
            <div className="h-full pt-8">
              <ErrorBoundary FallbackComponent={ErrorFallback}>
                <ChatWithParams 
                  chatId={currentChatId}
                  isNewChat={isNewChat}
                  onNewChatSubmit={handleNewChatSubmit}
                  isSidebarOpen={isSidebarOpen}
                />
              </ErrorBoundary>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="p-8">Loading chat...</div>}>
      <ChatPageContent />
    </Suspense>
  )
} 