"use client"

import { Code, FileText, MoreHorizontal, PenLine, Send, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
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

  // Separate message handling logic with useCallback
  const handleMessage = useCallback(async (userMessage: string) => {
    setMessages(prev => [...prev, { role: "user", content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat([{ role: "user", content: userMessage }]),
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
  }, [messages, studentName])

  // Process initial message if provided
  useEffect(() => {
    if (initialMessage && !initialMessageProcessed.current) {
      initialMessageProcessed.current = true
      handleMessage(initialMessage)
    }
  }, [initialMessage, handleMessage])

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
        <div className="relative space-y-6 p-6">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask your academic advisor..."
                className="w-full px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 rounded-2xl text-gray-800 placeholder-gray-500/90 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent text-lg shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-deep-blue hover:text-deep-blue/80 transition-colors disabled:opacity-50 bg-white/50 hover:bg-white/60 backdrop-blur-xl rounded-xl shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>

          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="flex items-center gap-2 text-base text-deep-blue/90 hover:text-deep-blue transition-colors"
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
          <div className="relative flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`relative p-4 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/20 text-white shadow-[0_8px_32px_0_rgba(26,54,93,0.15)] backdrop-saturate-[1.3] inline-block" 
                    : "bg-white/25 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]"
                } prose prose-base ${
                  msg.role === "user" ? "prose-invert" : "prose-gray"
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
              <div className="p-4 bg-white/25 backdrop-blur-2xl border border-white/50 rounded-lg animate-pulse shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]">
                Advising...
              </div>
            )}
          </div>
          
          {/* Fixed input area at bottom */}
          <div className="relative border-t border-white/20 p-4 space-y-6">
            <form onSubmit={handleSubmit}>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask your academic advisor..."
                  className="w-full px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 rounded-2xl text-gray-800 placeholder-gray-500/90 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent text-lg shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]"
                />
                <button
                  type="submit"
                  disabled={isLoading}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-deep-blue hover:text-deep-blue/80 transition-colors disabled:opacity-50 bg-white/50 hover:bg-white/60 backdrop-blur-xl rounded-xl shadow-sm"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>

            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  className="flex items-center gap-2 text-base text-deep-blue/90 hover:text-deep-blue transition-colors"
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

