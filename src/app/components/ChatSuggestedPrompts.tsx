import { useEffect, useRef, useState } from 'react'

interface ChatSuggestedPromptsProps {
  onPromptClick: (prompt: string) => void
  prompts: string[]
}

export default function ChatSuggestedPrompts({ 
  onPromptClick,
  prompts
}: ChatSuggestedPromptsProps) {
  const topRowRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)

  useEffect(() => {
    if (topRowRef.current) {
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
  }, [prompts]);

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
        className="flex-shrink-0 px-4 py-2 text-base text-deep-blue/75 hover:text-deep-blue 
                  bg-white/20 hover:bg-white/30 rounded-xl transition-all 
                  duration-200 backdrop-blur-sm border border-white/10 
                  whitespace-nowrap transform hover:scale-105 mx-1"
      >
        {truncatedPrompt}
      </button>
    )
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (topRowRef.current) {
      setIsDragging(true)
      setStartX(e.pageX - topRowRef.current.offsetLeft)
      const matrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform)
      setScrollLeft(matrix.m41)
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !topRowRef.current) return
    
    const x = e.pageX - topRowRef.current.offsetLeft
    const walk = (x - startX) * 2
    const newTransform = scrollLeft + walk
    
    const maxScroll = -topRowRef.current.scrollWidth / 2
    const boundedTransform = Math.max(maxScroll, Math.min(0, newTransform))
    
    topRowRef.current.style.transform = `translateX(${boundedTransform}px)`
  }

  return (
    <div className="w-full overflow-hidden py-6 -mb-6">
      <div 
        ref={topRowRef}
        className="flex gap-1.5 px-4 cursor-grab active:cursor-grabbing select-none"
        style={{
          width: 'max-content',
          WebkitOverflowScrolling: 'touch',
          transform: 'translateX(0)',
          willChange: 'transform',
          transition: 'transform 0.3s ease-out'
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => {
          if (topRowRef.current) {
            const animation = topRowRef.current.getAnimations()[0];
            if (animation) {
              animation.pause();
              const matrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform);
              topRowRef.current.style.transform = `translateX(${matrix.m41}px)`;
            }
          }
        }}
        onMouseLeave={() => {
          handleMouseUp();
          if (topRowRef.current) {
            const animation = topRowRef.current.getAnimations()[0];
            if (animation) {
              const matrix = new DOMMatrix(getComputedStyle(topRowRef.current).transform);
              const currentX = matrix.m41;
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
            const scrollAmount = (e.deltaX !== 0 ? e.deltaX : e.deltaY) * 2;
            const newX = currentX - scrollAmount;
            
            const maxScroll = -topRowRef.current.scrollWidth / 2;
            const boundedX = Math.max(maxScroll, Math.min(0, newX));
            
            topRowRef.current.style.transform = `translateX(${boundedX}px)`;
          }
        }}
      >
        {[...prompts, ...prompts].map((prompt, idx) => (
          <div key={`${prompt}-${idx}`} className="relative group">
            {promptButton(prompt, idx)}
            {idx === 0 && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-8 h-full bg-gradient-to-r from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
            {idx === prompts.length * 2 - 1 && (
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-8 h-full bg-gradient-to-l from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
} 