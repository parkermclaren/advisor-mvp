import ChatInterface from "./components/ChatInterface"
import ProgressBar from "./components/ProgressBar"
import WelcomeMessage from "./components/WelcomeMessage"

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Top status bar */}
        <div className="mb-12">
          <ProgressBar progress={65} />
        </div>

        {/* Centered welcome message */}
        <div className="mb-16 text-center">
          <WelcomeMessage name="Parker" />
        </div>

        {/* Main chat interface */}
        <div className="max-w-2xl mx-auto">
          <ChatInterface />
        </div>
      </div>
    </div>
  )
}

