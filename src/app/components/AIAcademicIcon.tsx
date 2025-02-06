export default function AIAcademicIcon({ className = "w-8 h-8" }: { className?: string }) {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#4CAF50", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#1A365D", stopOpacity: 1 }} />
          </linearGradient>
        </defs>
        <path
          d="M12 2L2 7L12 12L22 7L12 2Z"
          stroke="url(#grad)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M2 17L12 22L22 17" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L12 17L22 12" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="12" r="3" fill="url(#grad)" />
        <path d="M12 15V21" stroke="url(#grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }
  
  