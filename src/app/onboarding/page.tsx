'use client'

import { useState } from "react"
import OnboardingForm from "../components/OnboardingForm"

export default function OnboardingPage() {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-deep-blue/25 via-deep-blue/15 to-deep-blue/30">
      {/* Multiple radial gradients for depth and distribution - matching main dashboard */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(26,54,93,0.45),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_80%_30%,rgba(26,54,93,0.3),transparent_50%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_40%_80%,rgba(26,54,93,0.35),transparent_40%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_90%_85%,rgba(76,175,80,0.1),transparent_45%)]" />
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_10%_60%,rgba(76,175,80,0.08),transparent_50%)]" />
      
      {/* Content layer */}
      <div className="relative min-h-screen flex items-center justify-center">
        <div className="w-full max-w-2xl mx-auto px-4">
          {!showForm ? (
            /* Welcome card */
            <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
              <h1 className="text-6xl font-['Fraunces'] font-normal text-deep-blue tracking-[-0.02em] leading-tight">
                Welcome to AI Advisor
              </h1>
              <p className="mt-4 text-lg text-deep-blue/80">
                Let&apos;s take a moment to understand your academic journey and aspirations. The more details you share about your goals and interests, the better I can provide personalized course recommendations and guidance throughout your academic career.
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-8 px-6 py-3 bg-deep-blue text-white rounded-xl hover:bg-deep-blue/90 transition-colors"
              >
                Get Started
              </button>
            </div>
          ) : (
            /* Main onboarding form card */
            <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
              <OnboardingForm />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 