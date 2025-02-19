import { useEffect, useMemo, useRef } from 'react'
import { maxProgress } from '../lib/studentData'

// Generate contextual prompts based on student data
function generateContextualPrompts(): string[] {
  const prompts: string[] = []
  const { requirements, student_summary } = maxProgress

  // Personalized greeting and general status
  prompts.push(`Which courses should I take next semester?`)

  // Check incomplete gen ed requirements with specific categories
  const incompleteGenEds = requirements.filter(
    req => req.type === 'gen_ed' && req.student_status.status !== 'completed'
  )
  incompleteGenEds.forEach(req => {
    prompts.push(`What courses can I take for my ${req.title} requirement?`)
  })

  // Career-focused prompts based on specific goals
  student_summary.career_goals.forEach(goal => {
    prompts.push(`Which courses will best prepare me for a career in ${goal}?`)
  })

  // Academic interests-based prompts
  student_summary.academic_interests.forEach(interest => {
    prompts.push(`Are there any courses related to ${interest} that fit my requirements?`)
  })

  // GPA-focused prompts if needed
  if (student_summary.gpa < 3.0) {
    prompts.push("What can I do to improve my GPA?")
    prompts.push("Which courses should I focus on to raise my GPA?")
  }

  // Writing requirement specific prompts
  const writingReq = requirements.find(req => req.id === 'WRITING_DESIGNATED')
  if (writingReq?.student_status.needs_200_level) {
    prompts.push("What 200+ level writing courses are available?")
  }

  // Finance electives with specific focus
  const financeElectives = requirements.find(req => req.id === 'FINANCE_ELECTIVES')
  if (financeElectives?.student_status.status !== 'completed') {
    const remainingCredits = 12 - (financeElectives?.student_status.credits_completed || 0)
    prompts.push(`What finance electives can I take for my remaining ${remainingCredits} credits?`)
  }

  // Next term planning
  prompts.push(`Generate a comprehensive degree audit`)
  
  // Credits and graduation timeline
  const remainingCredits = 125 - student_summary.completed_credits
  if (remainingCredits > 0) {
    prompts.push(`How can I complete my remaining ${remainingCredits} credits most efficiently?`)
  }

  // Add specific course prerequisites based on intended courses
  if (financeElectives?.student_status.courses_completed) {
    prompts.push("What prerequisites do I need for advanced finance courses?")
  }

  // Internship and career preparation
  if (student_summary.academic_standing === 'Junior' || student_summary.academic_standing === 'Senior') {
    prompts.push("How should I prepare for my internship requirements?")
    prompts.push("Which courses will help with my internship preparation?")
  }

  return prompts
}

interface SuggestedPromptsProps {
  onPromptClick: (prompt: string) => void
  mode?: 'static' | 'dynamic'
  dynamicPrompts?: string[]
}

export default function SuggestedPrompts({ 
  onPromptClick, 
  mode = 'static',
  dynamicPrompts = []
}: SuggestedPromptsProps) {
  const topRowRef = useRef<HTMLDivElement>(null)
  const bottomRowRef = useRef<HTMLDivElement>(null)
  
  const prompts = mode === 'static' ? generateContextualPrompts() : dynamicPrompts
  
  // Memoize the split prompts
  const { topPrompts, bottomPrompts } = useMemo(() => {
    const midpoint = Math.ceil(prompts.length / 2)
    return {
      topPrompts: mode === 'static' ? prompts.slice(0, midpoint) : prompts,
      bottomPrompts: mode === 'static' ? prompts.slice(midpoint) : []
    }
  }, [mode, prompts])
  
  // Use useMemo to prevent recreation on every render
  const repeatedPrompts = useMemo(() => {
    const topRepeated = mode === 'static' 
      ? [...topPrompts, ...topPrompts, ...topPrompts, ...topPrompts]
      : [...prompts, ...prompts];
    const bottomRepeated = mode === 'static'
      ? [...bottomPrompts, ...bottomPrompts, ...bottomPrompts, ...bottomPrompts]
      : [];
    return { topRepeated, bottomRepeated };
  }, [mode, topPrompts, bottomPrompts, prompts]);

  // Add animation for dynamic mode
  useEffect(() => {
    if (mode === 'dynamic' && topRowRef.current) {
      const scrollWidth = topRowRef.current.scrollWidth;
      const animation = topRowRef.current.animate(
        [
          { transform: 'translateX(0)' },
          { transform: `translateX(-${scrollWidth/2}px)` }
        ],
        {
          duration: 120000,
          iterations: Infinity,
          easing: 'linear'
        }
      );

      return () => animation.cancel();
    }
  }, [mode, repeatedPrompts.topRepeated]);

  // Static mode animation remains unchanged
  useEffect(() => {
    if (mode === 'static' && topRowRef.current && bottomRowRef.current) {
      // Set initial positions
      topRowRef.current.style.transform = 'translateX(0)'
      bottomRowRef.current.style.transform = 'translateX(0)'

      // Create keyframes for top row (left to right)
      const topKeyframes = [
        { transform: 'translateX(0)' },
        { transform: `translateX(-${(topPrompts.length * 200)}px)` }
      ]

      // Create keyframes for bottom row (right to left)
      const bottomKeyframes = [
        { transform: `translateX(-${(bottomPrompts.length * 200)}px)` },
        { transform: 'translateX(0)' }
      ]

      const duration = 100000

      const topAnimation = topRowRef.current.animate(topKeyframes, {
        duration,
        iterations: Infinity,
        easing: 'linear'
      })

      const bottomAnimation = bottomRowRef.current.animate(bottomKeyframes, {
        duration,
        iterations: Infinity,
        easing: 'linear'
      })

      return () => {
        topAnimation.cancel()
        bottomAnimation.cancel()
      }
    }
  }, [mode, topPrompts.length, bottomPrompts.length])

  const promptButton = (prompt: string, idx: number) => {
    const MAX_LENGTH = 50
    const truncatedPrompt = prompt.length > MAX_LENGTH 
      ? prompt.substring(0, MAX_LENGTH - 3) + "..."
      : prompt

    return (
      <button
        key={`${prompt}-${idx}`}
        onClick={() => onPromptClick(prompt)}
        title={prompt}
        className={`flex-shrink-0 px-4 py-2 text-base text-deep-blue/75 hover:text-deep-blue 
                  bg-white/20 hover:bg-white/30 rounded-xl transition-all 
                  duration-200 backdrop-blur-sm border border-white/10 
                  whitespace-nowrap transform hover:scale-105
                  ${mode === 'dynamic' ? 'mx-1' : ''}`}
      >
        {truncatedPrompt}
      </button>
    )
  }

  if (mode === 'dynamic') {
    return (
      <div className="w-full overflow-hidden py-6 -mb-6">
        <div 
          ref={topRowRef}
          className="flex gap-2 px-4 hover:cursor-grab active:cursor-grabbing"
          style={{
            width: 'max-content',
            cursor: 'grab',
            WebkitOverflowScrolling: 'touch',
            transform: 'translateX(0)',
            willChange: 'transform'
          }}
          onMouseEnter={() => {
            if (topRowRef.current) {
              const animation = topRowRef.current.getAnimations()[0];
              if (animation) {
                animation.pause();
                // Store the current transform value when paused
                const matrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform);
                topRowRef.current.style.transform = `translateX(${matrix.m41}px)`;
              }
            }
          }}
          onMouseLeave={() => {
            if (topRowRef.current) {
              const animation = topRowRef.current.getAnimations()[0];
              if (animation) {
                // Get the current transform value
                const matrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform);
                const currentX = matrix.m41;
                
                // Create a new animation starting from the current position
                const scrollWidth = topRowRef.current.scrollWidth;
                animation.cancel();
                
                topRowRef.current.animate(
                  [
                    { transform: `translateX(${currentX}px)` },
                    { transform: `translateX(-${scrollWidth/2}px)` }
                  ],
                  {
                    duration: 120000,
                    iterations: Infinity,
                    easing: 'linear'
                  }
                );
              }
            }
          }}
          onWheel={(e) => {
            if (topRowRef.current) {
              e.preventDefault();
              const currentMatrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform);
              const currentX = currentMatrix.m41;
              const scrollAmount = e.deltaX !== 0 ? e.deltaX : e.deltaY;
              const newX = currentX - scrollAmount;
              
              // Apply boundaries to prevent over-scrolling
              const maxScroll = -topRowRef.current.scrollWidth / 2;
              const boundedX = Math.max(maxScroll, Math.min(0, newX));
              
              topRowRef.current.style.transform = `translateX(${boundedX}px)`;
            }
          }}
        >
          {repeatedPrompts.topRepeated.map((prompt, idx) => promptButton(prompt, idx))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-full space-y-2 py-2 -mb-4">
      {/* Top row - moving left */}
      <div className="w-full overflow-hidden">
        <div 
          ref={topRowRef}
          className="flex space-x-4"
        >
          {repeatedPrompts.topRepeated.map((prompt, idx) => promptButton(prompt, idx))}
        </div>
      </div>

      {/* Bottom row - moving right */}
      <div className="w-full overflow-hidden">
        <div 
          ref={bottomRowRef}
          className="flex space-x-4"
        >
          {repeatedPrompts.bottomRepeated.map((prompt, idx) => promptButton(prompt, idx))}
        </div>
      </div>
    </div>
  )
} 