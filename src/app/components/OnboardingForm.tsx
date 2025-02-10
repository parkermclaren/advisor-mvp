'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

const TOTAL_STEPS = 4

const INTEREST_OPTIONS = [
  'Technology & Computing',
  'Creative Arts & Design',
  'Business & Entrepreneurship',
  'Social Impact & Sustainability',
  'Sports & Performance',
  'Media & Entertainment',
  'Science & Discovery',
  'History & Global Cultures',
  'Health & Wellness',
  'Writing & Communication'
] as const

const SCHEDULE_PRIORITIES = [
  'Avoid classes before 10am',
  'Keep evenings free (after 5pm)',
  'Prefer classes on MWF pattern',
  'Prefer classes on TR pattern',
  'Prefer breaks between classes',
  'Prefer back-to-back classes'
] as const

const COMMITMENTS = [
  'Part-time job/internship',
  'Varsity athletics',
  'Club sports',
  'Student organizations/clubs',
  'Greek life',
  'Research/lab work'
] as const

interface FormData {
  careerGoals: string
  interests: string[]
  schedulePriorities: string[]
  commitments: string[]
}

export default function OnboardingForm() {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<FormData>({
    careerGoals: '',
    interests: [],
    schedulePriorities: [],
    commitments: []
  })
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          goals: formData.careerGoals,
          interests: formData.interests,
          schedule_priorities: formData.schedulePriorities,
          commitments: formData.commitments
        })
      })

      if (!response.ok) {
        throw new Error('Failed to save profile')
      }

      // Redirect to main page instead of chat
      router.push('/')
    } catch (error) {
      console.error('Error saving profile:', error)
    }
  }

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <span className="text-deep-blue/80 text-sm">Step {currentStep} of {TOTAL_STEPS}</span>
          <div className="h-1 w-32 bg-white/20 rounded-full">
            <div 
              className="h-full bg-deep-blue/80 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Form steps with animations */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl text-deep-blue font-medium">What are your career aspirations?</h2>
              <p className="text-deep-blue/80">Share your long-term goals to help us provide more relevant course recommendations</p>
              <textarea
                value={formData.careerGoals}
                onChange={(e) => setFormData({ ...formData, careerGoals: e.target.value })}
                placeholder="e.g., I aim to become a financial analyst, focusing on sustainable investments..."
                className="w-full px-6 py-4 bg-white/25 backdrop-blur-2xl border border-white/50 rounded-xl text-gray-800 placeholder-gray-500/90 focus:outline-none focus:ring-2 focus:ring-white/40 focus:border-transparent min-h-[120px]"
              />
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl text-deep-blue font-medium">What academic subjects interest you most?</h2>
              <p className="text-deep-blue/80">Select all that apply to help personalize your course recommendations</p>
              <div className="grid grid-cols-2 gap-3">
                {INTEREST_OPTIONS.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      interests: prev.interests.includes(interest)
                        ? prev.interests.filter(i => i !== interest)
                        : [...prev.interests, interest]
                    }))}
                    className={`p-4 rounded-xl border transition-all w-full whitespace-nowrap text-center ${
                      formData.interests.includes(interest)
                        ? 'bg-deep-blue text-white border-deep-blue shadow-lg'
                        : 'bg-white/25 backdrop-blur-xl border-white/50 hover:bg-white/40 text-deep-blue'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 3 && (
            <motion.div
              key="step3"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl text-deep-blue font-medium">What are your scheduling preferences?</h2>
              <p className="text-deep-blue/80">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {SCHEDULE_PRIORITIES.map(priority => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      schedulePriorities: prev.schedulePriorities.includes(priority)
                        ? prev.schedulePriorities.filter(p => p !== priority)
                        : [...prev.schedulePriorities, priority]
                    }))}
                    className={`p-4 rounded-xl border transition-all w-full whitespace-nowrap text-center ${
                      formData.schedulePriorities.includes(priority)
                        ? 'bg-deep-blue text-white border-deep-blue shadow-lg'
                        : 'bg-white/25 backdrop-blur-xl border-white/50 hover:bg-white/40 text-deep-blue'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <h2 className="text-2xl text-deep-blue font-medium">What commitments should I know about?</h2>
              <p className="text-deep-blue/80">Select all that apply</p>
              <div className="grid grid-cols-2 gap-3">
                {COMMITMENTS.map(commitment => (
                  <button
                    key={commitment}
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      commitments: prev.commitments.includes(commitment)
                        ? prev.commitments.filter(c => c !== commitment)
                        : [...prev.commitments, commitment]
                    }))}
                    className={`p-4 rounded-xl border transition-all w-full whitespace-nowrap text-center ${
                      formData.commitments.includes(commitment)
                        ? 'bg-deep-blue text-white border-deep-blue shadow-lg'
                        : 'bg-white/25 backdrop-blur-xl border-white/50 hover:bg-white/40 text-deep-blue'
                    }`}
                  >
                    {commitment}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4">
        {currentStep > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="px-6 py-3 text-deep-blue/90 hover:text-deep-blue transition-colors"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={currentStep === TOTAL_STEPS ? handleSubmit : nextStep}
          className="ml-auto px-6 py-3 bg-deep-blue text-white rounded-xl hover:bg-deep-blue/90 transition-colors"
        >
          {currentStep === TOTAL_STEPS ? 'Start Chatting' : 'Next'}
        </button>
      </div>
    </form>
  )
} 