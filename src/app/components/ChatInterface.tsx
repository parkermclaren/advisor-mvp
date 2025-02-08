"use client"

import { Code, FileText, MoreHorizontal, PenLine, Send, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'

interface Message {
  role: "user" | "assistant"
  content: string
}

interface ChatInterfaceProps {
  startInChatMode?: boolean
  initialMessage?: string | null
  studentName?: string
}

export default function ChatInterface({ 
  startInChatMode = false, 
  initialMessage = null,
  studentName = "Grenert, Max" // Default to our test student
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const initialMessageProcessed = useRef(false)

  const quickActions = [
    { icon: Sparkles, label: "Course Suggestions" },
    { icon: PenLine, label: "Degree Planning" },
    { icon: Code, label: "Prerequisites" },
    { icon: FileText, label: "Transcript Review" },
    { icon: MoreHorizontal, label: "More" },
  ]

  // Process initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageProcessed.current) {
      initialMessageProcessed.current = true
      handleMessage(initialMessage)
    }
  }, [initialMessage])

  // Separate message handling logic
  const handleMessage = async (userMessage: string) => {
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, { role: "user", content: userMessage }],
          studentName
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const data = await response.json()
      setMessages(prev => [...prev, { role: "assistant", content: data.message }])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "I apologize, but I encountered an error. Please try again." 
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage("")

    // If this is the first message and we're not in chat mode, redirect immediately
    if (messages.length === 0 && !startInChatMode) {
      router.push(`/chat?message=${encodeURIComponent(userMessage)}`)
      return
    }

    // Otherwise, handle the message normally
    await handleMessage(userMessage)
  }

  // Always show chat layout if startInChatMode is true
  const showChatLayout = startInChatMode || messages.length > 0

  return (
    <div className={`flex flex-col ${showChatLayout ? 'h-full' : ''}`}>
      {!showChatLayout ? (
        // Initial centered layout
        <div className="space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask your academic advisor..."
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-deep-blue focus:border-transparent text-base"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-deep-blue transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="flex items-center gap-2 text-base text-deep-blue hover:opacity-80"
              >
                <action.icon className="w-4 h-4" />
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        // Chat layout
        <>
          {/* Scrollable chat area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-gray-50" 
                    : "bg-deep-blue text-white"
                } prose prose-base max-w-none ${
                  msg.role === "assistant" ? "prose-invert" : ""
                }`}
              >
                {msg.role === "user" ? (
                  msg.content
                ) : (
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="p-4 bg-gray-50 rounded-lg animate-pulse">
                Thinking...
              </div>
            )}
          </div>
          
          {/* Fixed input area at bottom */}
          <div className="border-t border-gray-200 p-4 bg-white space-y-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask your academic advisor..."
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-full text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-deep-blue focus:border-transparent text-base"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-deep-blue transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="flex items-center gap-2 text-base text-deep-blue hover:opacity-80"
                >
                  <action.icon className="w-4 h-4" />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

