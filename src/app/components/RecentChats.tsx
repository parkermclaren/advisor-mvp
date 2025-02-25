"use client"

import { formatDistanceToNow } from 'date-fns'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { maxProgress } from '../lib/studentData'
import { ChatSession } from '../lib/types'

export default function RecentChats() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const userId = maxProgress.student_summary.id
        const response = await fetch(`/api/chat-sessions?user_id=${userId}`)
        if (!response.ok) throw new Error('Failed to fetch chat sessions')
        const data = await response.json()
        // Take only the first 6 sessions since they're already ordered by most recent
        setSessions(data.slice(0, 6))
      } catch (error: unknown) {
        console.error('Error fetching chat sessions:', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    fetchSessions()
  }, [])

  const handleChatClick = (chatId: string) => {
    router.push(`/chat?id=${chatId}`)
  }

  const getRelativeTime = (date: string) => {
    try {
      return formatDistanceToNow(new Date(date), { addSuffix: true })
        .replace('about ', '')
        .replace('less than a minute ago', 'just now')
    } catch {
      return 'recently'
    }
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-32 bg-white/25 backdrop-blur-xl border border-white/50 rounded-2xl 
                     animate-pulse shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]"
          />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {sessions.map((session) => (
        <button
          key={session.chat_id}
          onClick={() => handleChatClick(session.chat_id)}
          className="h-32 bg-white/25 backdrop-blur-xl border border-white/50 rounded-2xl p-4
                   shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] hover:bg-white/30 transition-colors
                   text-left overflow-hidden flex flex-col justify-between"
        >
          <h3 className="font-medium text-deep-blue line-clamp-2 text-base leading-snug">
            {session.chat_name}
          </h3>
          <p className="text-xs text-deep-blue/60 mt-2">
            {getRelativeTime(session.updated_at)}
          </p>
        </button>
      ))}
    </div>
  )
} 