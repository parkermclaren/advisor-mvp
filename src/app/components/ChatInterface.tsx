"use client"

import { Send } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from "../lib/types"
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
  currentChatId?: string
  isNewChat?: boolean
  onNewChatSubmit?: (message: string) => Promise<{ content: string, chat_id: string }>
  isSidebarOpen?: boolean
}

export default function ChatInterface({ 
  startInChatMode = false, 
  initialMessage = null,
  studentName = "Grenert, Max", // Default to our test student
  currentChatId: propsChatId,
  isNewChat = false,
  onNewChatSubmit,
  isSidebarOpen = true
}: ChatInterfaceProps) {
  const [message, setMessage] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [localChatId, setLocalChatId] = useState<string | undefined>(propsChatId)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const initialMessageProcessed = useRef(false)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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
          chat_id: localChatId,
          studentName
        })
      })

      if (!response.ok) throw new Error("Failed to get response")

      const chatData = await response.json()
      
      // Update current chat ID if this is a new chat
      if (chatData.chat_id && !localChatId) {
        setLocalChatId(chatData.chat_id)
      }
      
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
  }, [messages, localChatId, studentName])

  // Load messages when a chat is selected
  const loadChatMessages = useCallback(async (chatId: string) => {
    try {
      const response = await fetch(`/api/chat-messages?chat_id=${chatId}`)
      if (!response.ok) throw new Error('Failed to load chat messages')
      
      const messages: ChatMessage[] = await response.json()
      // Set messages and mark initial message as processed
      setMessages(messages.map(msg => ({
        role: msg.role === 'User' ? 'user' : 'assistant',
        content: msg.content
      })))
      setLocalChatId(chatId)
      initialMessageProcessed.current = true  // Mark as processed to prevent regeneration
    } catch (error) {
      console.error('Error loading chat messages:', error)
    }
  }, [])

  // Update localChatId and load messages when prop changes
  useEffect(() => {
    if (propsChatId) {
      loadChatMessages(propsChatId)
    }
  }, [propsChatId, loadChatMessages])

  // Process initial message if provided and we're NOT in an existing chat
  useEffect(() => {
    const shouldProcessInitialMessage = 
      initialMessage && 
      !initialMessageProcessed.current && 
      !propsChatId && 
      !isNewChat &&
      messages.length === 0  // Only process if we have no messages

    if (shouldProcessInitialMessage) {
      initialMessageProcessed.current = true
      handleMessage(initialMessage)
    }
  }, [initialMessage, propsChatId, isNewChat, handleMessage, messages.length])

  // Add useEffect to log suggestions state changes
  useEffect(() => {
    console.log('Suggestions state updated:', suggestions)
  }, [suggestions])

  // Modify handleSubmit to handle new chat case
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isLoading) return

    const userMessage = message.trim()
    setMessage("")

    if (isNewChat && onNewChatSubmit) {
      // Immediately transition to chat mode and show loading state
      setMessages([{ role: "user" as const, content: userMessage }])
      setIsLoading(true)
      try {
        const chatData = await onNewChatSubmit(userMessage)
        
        // Update messages with AI response
        const newMessages = [
          { role: "user" as const, content: userMessage },
          { role: "assistant" as const, content: chatData.content }
        ]
        setMessages(newMessages)

        // Get suggestions for the new chat
        const suggestionsData = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: newMessages })
        }).then(r => r.json())

        setSuggestions(suggestionsData.suggestions || [])
      } catch (error) {
        console.error('Error submitting new chat:', error)
        setMessages(prev => [...prev, { 
          role: "assistant" as const, 
          content: "I apologize, but I encountered an error. Please try again." 
        }])
        setSuggestions([])
      } finally {
        setIsLoading(false)
      }
      return
    }

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

  // Show centered input for new chat
  if (isNewChat) {
    return (
      <div className="h-full flex flex-col items-center justify-center -mt-16">
        <div className="w-full max-w-2xl space-y-6">
          <form onSubmit={handleSubmit}>
            <div className="relative">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value)
                  e.target.style.height = 'auto'
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
      </div>
    )
  }

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
          <div className="relative flex-1 overflow-y-auto px-8 py-8 pb-48 space-y-6 
            scrollbar-thin scrollbar-track-white/20 scrollbar-thumb-white/60 
            hover:scrollbar-thumb-white/80 scrollbar-track-rounded-full scrollbar-thumb-rounded-full">
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`relative ${
                    msg.role === "user"
                      ? "inline-block bg-deep-blue/80 backdrop-blur-xl border border-deep-blue/20 text-white shadow-[0_8px_32px_0_rgba(26,54,93,0.15)] backdrop-saturate-[1.3]"
                      : "bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]"
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
                <div className="block w-full bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-6 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] animate-pulse">
                  Advising...
                </div>
              )}
              {/* Invisible element to scroll to */}
              <div ref={messagesEndRef} />
            </div>
          </div>
          
          {/* Fixed input area at bottom with increased spacing */}
          <div className={`fixed bottom-0 right-0 ${isSidebarOpen ? 'left-[calc(256px+1.5rem)]' : 'left-0'} 
                        border-t border-white/20 p-8 space-y-6 bg-white/15 backdrop-blur-md transition-all duration-300`}>
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

