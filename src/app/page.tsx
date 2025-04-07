import ChatInterface from "./components/ChatInterface"
import ProgressBar from "./components/ProgressBar"
import RecentChats from "./components/RecentChats"
import { maxProgress } from './lib/studentData'

export default function Dashboard() {
  return (
    <div className="min-h-screen relative bg-gradient-to-br from-deep-blue/30 via-deep-blue/20 to-deep-blue/35">
      {/* Multiple radial gradients for depth and distribution */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,54,93,0.55),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(26,54,93,0.4),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(26,54,93,0.45),transparent_40%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_85%,rgba(76,175,80,0.15),transparent_45%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_60%,rgba(76,175,80,0.12),transparent_50%)]" />
      
      {/* Content layer */}
      <div className="relative">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto space-y-8 mb-12">
            {/* Top status bar */}
            <div>
              <ProgressBar />
            </div>

            {/* Main card with glassmorphism */}
            <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
              {/* Centered welcome message */}
              <div className="text-center mb-0">
                <h1 className="text-6xl font-['Ariane_Coachella'] font-normal text-deep-blue tracking-tight leading-tight">
                  Welcome, {maxProgress.student_summary.name.split(' ')[0]}
                </h1>
              </div>

              {/* Main chat interface */}
              <ChatInterface />
            </div>

            {/* Recent Chats Section */}
            <div>
              <h2 className="text-2xl font-['Ariane_Coachella'] font-normal text-deep-blue mb-4">
                Recent Conversations
              </h2>
              <RecentChats />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

