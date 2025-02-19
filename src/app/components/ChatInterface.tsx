"use client"

import { Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import ChatSuggestedPrompts from './ChatSuggestedPrompts'
import SuggestedPrompts from './SuggestedPrompts'

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
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const initialMessageProcessed = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Add useEffect to log suggestions state changes
  useEffect(() => {
    console.log('Suggestions state updated:', suggestions)
  }, [suggestions])

  // Separate message handling logic with useCallback
  const handleMessage = useCallback(async (userMessage: string) => {
    // Clear suggestions when sending a new message
    setSuggestions([])
    setMessages(prev => [...prev, { role: "user" as const, content: userMessage }])
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat([{ role: "user" as const, content: userMessage }]),
          studentName
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const chatData = await response.json()
      
      // Get both chat response and suggestions in parallel
      const suggestionsData = await fetch("/api/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.concat([
            { role: "user" as const, content: userMessage },
            { role: "assistant" as const, content: chatData.content }
          ])
        })
      }).then(r => r.json())

      const newMessages = [...messages, 
        { role: "user" as const, content: userMessage },
        { role: "assistant" as const, content: chatData.content }
      ]
      
      // Update both messages and suggestions simultaneously
      setMessages(newMessages)
      setSuggestions(suggestionsData.suggestions || [])
    } catch (error) {
      console.error("Error:", error)
      setMessages(prev => [...prev, { 
        role: "assistant" as const, 
        content: "I apologize, but I encountered an error. Please try again." 
      }])
      setSuggestions([])
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

  const handlePromptClick = (prompt: string) => {
    setMessage(prompt)
  }

  // Add effect to handle textarea height adjustment
  useEffect(() => {
    if (inputRef.current) {
      const textarea = inputRef.current as HTMLTextAreaElement
      // Reset height first
      textarea.style.height = 'auto'
      // Then set to scrollHeight
      const newHeight = Math.max(60, textarea.scrollHeight)
      textarea.style.height = `${newHeight}px`
    }
  }, [message])

  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <div className={`flex flex-col ${showChatLayout ? 'h-full' : ''}`}>
      {!showChatLayout ? (
        // Initial centered layout
        <div className="relative space-y-6 p-6">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  // Reset height first
                  e.target.style.height = 'auto'
                  // Then set to scrollHeight
                  const newHeight = Math.max(60, e.target.scrollHeight)
                  e.target.style.height = `${newHeight}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="Ask your academic advisor..."
                rows={1}
                className="w-full px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 
                         rounded-2xl text-gray-800 placeholder-gray-500/90 focus:outline-none 
                         focus:ring-2 focus:ring-white/40 focus:border-transparent text-lg 
                         shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]
                         resize-none overflow-hidden min-h-[3.75rem] max-h-[20rem]"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-deep-blue 
                         hover:text-deep-blue/80 transition-colors disabled:opacity-50 
                         bg-white/50 hover:bg-white/60 backdrop-blur-xl rounded-xl shadow-sm"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </form>

          <SuggestedPrompts onPromptClick={handlePromptClick} mode="static" />
        </div>
      ) : (
        // Chat layout with improved scrollbar and spacing
        <>
          {/* Scrollable chat area with custom scrollbar */}
          <div className="relative flex-1 overflow-y-auto px-8 py-8 space-y-6 
            scrollbar-thin scrollbar-track-white/20 scrollbar-thumb-white/60 
            hover:scrollbar-thumb-white/80 scrollbar-track-rounded-full scrollbar-thumb-rounded-full">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`relative ${
                    msg.role === "user"
                      ? "inline-block bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/20 text-white shadow-[0_8px_32px_0_rgba(26,54,93,0.15)] backdrop-saturate-[1.3]"
                      : "bg-white/25 backdrop-blur-2xl border border-white/50 shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3] max-w-[100%]"
                  } p-6 rounded-2xl prose prose-base ${
                    msg.role === "user" ? "prose-invert" : "prose-gray"
                  }`}
                >
                  {msg.role === "user" ? (
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                  ) : (
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="block w-full bg-white/25 backdrop-blur-2xl border border-white/50 rounded-2xl p-6 animate-pulse shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]">
                  Advising...
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Fixed input area at bottom with increased spacing */}
          <div className="relative border-t border-white/20 p-8 space-y-6 bg-white/5 backdrop-blur-sm">
            <div className="max-w-4xl mx-auto">
              <form onSubmit={handleSubmit}>
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value)
                      // Reset height first
                      e.target.style.height = 'auto'
                      // Then set to scrollHeight
                      const newHeight = Math.max(60, e.target.scrollHeight)
                      e.target.style.height = `${newHeight}px`
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSubmit(e)
                      }
                    }}
                    placeholder="Ask your academic advisor..."
                    rows={1}
                    className="w-full px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 
                             rounded-2xl text-gray-800 placeholder-gray-500/90 focus:outline-none 
                             focus:ring-2 focus:ring-white/40 focus:border-transparent text-lg 
                             shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]
                             resize-none overflow-hidden min-h-[3.75rem] max-h-[20rem]"
                  />
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-2.5 text-deep-blue 
                             hover:text-deep-blue/80 transition-colors disabled:opacity-50 
                             bg-white/50 hover:bg-white/60 backdrop-blur-xl rounded-xl shadow-sm"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>

              {messages.length > 0 && !isLoading && suggestions.length > 0 && (
                <ChatSuggestedPrompts 
                  onPromptClick={handlePromptClick} 
                  prompts={suggestions}
                />
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

