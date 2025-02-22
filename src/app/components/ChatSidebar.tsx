"use client"

import { MoreVertical, PanelLeftClose, Plus, Trash } from 'lucide-react';
import { useEffect, useState } from 'react';
import { maxProgress } from '../lib/studentData';
import { ChatSession } from '../lib/types';
import NewChatModal from './NewChatModal';

interface ChatSidebarProps {
  currentChatId?: string;
  onChatSelect: (chatId: string) => void;
  onNewChat: () => void;
  isOpen: boolean;
  onToggle: () => void;
}

export default function ChatSidebar({ currentChatId, onChatSelect, onNewChat, isOpen, onToggle }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);

  // Store user ID in localStorage on first load
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUserId = localStorage.getItem('userId');
      if (!storedUserId) {
        localStorage.setItem('userId', maxProgress.student_summary.id);
      }
    }
  }, []);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) {
          console.error('No user ID found');
          return;
        }

        const response = await fetch(`/api/chat-sessions?user_id=${userId}`);
        if (!response.ok) throw new Error('Failed to fetch chat sessions');
        const data = await response.json();
        setSessions(data);
      } catch (error) {
        console.error('Error fetching chat sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const handleNewChatSubmit = async (message: string) => {
    setIsNewChatModalOpen(false);
    
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
        // Refresh sessions list
        const sessionsResponse = await fetch('/api/chat-sessions');
        if (sessionsResponse.ok) {
          const newSessions = await sessionsResponse.json();
          setSessions(newSessions);
        }
        // Select the new chat
        onChatSelect(data.chat_id);
      }
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        console.error('No user ID found');
        return;
      }

      const response = await fetch(`/api/chat-sessions?chat_id=${chatId}&user_id=${userId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete chat');

      // Remove chat from local state
      setSessions(prev => prev.filter(session => session.chat_id !== chatId));
      
      // If the deleted chat was selected, clear selection
      if (chatId === currentChatId) {
        onNewChat();
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    } finally {
      setActiveDropdown(null);
    }
  };

  const toggleDropdown = (chatId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveDropdown(prev => prev === chatId ? null : chatId);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-menu') && !target.closest('.dropdown-trigger')) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Update dropdown position when active dropdown changes
  useEffect(() => {
    if (activeDropdown) {
      const trigger = document.querySelector(`[data-chat-id="${activeDropdown}"] .dropdown-trigger`);
      if (trigger) {
        const rect = trigger.getBoundingClientRect();
        setDropdownPosition({
          // Center horizontally with the three dots
          left: rect.left + (rect.width / 2),
          // Position below with some spacing
          top: rect.bottom + 4
        });
      }
    } else {
      setDropdownPosition(null);
    }
  }, [activeDropdown]);

  return (
    <>
      <div className={`w-64 h-[calc(100vh-4.5rem)] mt-6 transition-all duration-300 ${isOpen ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full'}`}>
        <div className="h-full bg-white/25 backdrop-blur-xl border border-white/50 
                      rounded-3xl shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] flex flex-col">
          {/* New Chat and Toggle Buttons */}
          <div className="p-4 flex gap-2">
            <button
              onClick={onNewChat}
              className="flex-1 px-6 py-5 bg-white/25 backdrop-blur-2xl border border-white/50 
                       rounded-2xl text-deep-blue hover:bg-white/30 transition-colors text-sm font-medium
                       shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]
                       flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>New Chat</span>
            </button>
            <button
              onClick={onToggle}
              className="p-5 bg-white/25 backdrop-blur-2xl border border-white/50 
                       rounded-2xl text-deep-blue hover:bg-white/30 transition-colors
                       shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-2 space-y-2 mb-4 scrollbar-thin scrollbar-track-white/20 
                        scrollbar-thumb-white/60 hover:scrollbar-thumb-white/80 
                        scrollbar-track-rounded-full scrollbar-thumb-rounded-full">
            {isLoading ? (
              <div className="p-4 text-center text-deep-blue/60">Loading chats...</div>
            ) : sessions.length === 0 ? (
              <div className="p-4 text-center text-deep-blue/60">No chat history</div>
            ) : (
              sessions.map((session) => (
                <div
                  key={session.chat_id}
                  data-chat-id={session.chat_id}
                  onClick={() => onChatSelect(session.chat_id)}
                  className={`group relative w-full text-left p-3 rounded-xl transition-colors text-sm cursor-pointer
                           ${currentChatId === session.chat_id
                             ? 'bg-deep-blue/10 hover:bg-deep-blue/15'
                             : 'hover:bg-white/30'
                           }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-deep-blue truncate">
                        {session.chat_name}
                      </div>
                      <div className="text-xs text-deep-blue/60 mt-1">
                        {new Date(session.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={(e) => toggleDropdown(session.chat_id, e)}
                        className="p-1 rounded-lg hover:bg-white/30 transition-colors opacity-0 group-hover:opacity-100 dropdown-trigger"
                      >
                        <MoreVertical className="w-4 h-4 text-deep-blue/60" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dropdown rendered outside of scrollable container */}
      {activeDropdown && dropdownPosition && (
        <div
          className="fixed z-[60]"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            transform: 'translateX(-50%)' // Center the dropdown
          }}
        >
          <div className="w-36 bg-white/25 backdrop-blur-xl border border-white/50 
                       rounded-2xl shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] py-1.5 dropdown-menu
                       animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={(e) => handleDeleteChat(activeDropdown, e)}
              className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-white/30 
                       transition-colors flex items-center gap-2 hover:text-red-600"
            >
              <Trash className="w-4 h-4" />
              Delete chat
            </button>
          </div>
        </div>
      )}

      <NewChatModal 
        isOpen={isNewChatModalOpen}
        onClose={() => setIsNewChatModalOpen(false)}
        onSubmit={handleNewChatSubmit}
      />
    </>
  );
} 