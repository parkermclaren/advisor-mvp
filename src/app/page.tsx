import ChatInterface from "./components/ChatInterface"
import ProgressBar from "./components/ProgressBar"

export default function Dashboard() {
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
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="max-w-2xl mx-auto">
            {/* Top status bar */}
            <div className="mb-8">
              <ProgressBar />
            </div>

            {/* Main card with glassmorphism */}
            <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
              {/* Centered welcome message */}
              <div className="text-center mb-1">
                <h1 className="text-6xl font-['Fraunces'] font-normal text-deep-blue tracking-[-0.02em] leading-tight">
                  Welcome, Max
                </h1>
              </div>

              {/* Main chat interface */}
              <ChatInterface />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

