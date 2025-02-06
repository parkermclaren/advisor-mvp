interface ProgressBarProps {
    progress: number
  }
  
  export default function ProgressBar({ progress }: ProgressBarProps) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">Degree Progress</span>
          <span className="text-sm font-medium text-gray-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 shadow-inner">
          <div
            className="h-4 rounded-full bg-gradient-to-r from-ai-green to-deep-blue transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="h-full w-full bg-opacity-20 bg-white rounded-full"></div>
          </div>
        </div>
      </div>
    )
  }
  
  