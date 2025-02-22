"use client"

import { User } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

export default function ProfileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 bg-white/25 backdrop-blur-xl border border-white/50 rounded-xl 
                 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] hover:bg-white/30 transition-colors"
      >
        <User className="w-5 h-5 text-deep-blue" />
      </button>

      {isOpen && (
        <>
          {/* Invisible overlay to capture clicks */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 z-20 bg-white/25 backdrop-blur-xl 
                        border border-white/50 rounded-xl shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
            <div className="py-1">
              <Link
                href="/"
                className="block px-4 py-2 text-deep-blue hover:bg-white/30 transition-colors"
                onClick={() => setIsOpen(false)}
              >
                Home
              </Link>
              <button
                className="block w-full text-left px-4 py-2 text-deep-blue hover:bg-white/30 
                         transition-colors opacity-50 cursor-not-allowed"
              >
                Settings
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 