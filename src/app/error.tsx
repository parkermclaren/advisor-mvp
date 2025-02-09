'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to your error reporting service
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white p-4">
      <div className="text-center space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">Something went wrong!</h2>
        <p className="text-gray-600">{error.message}</p>
        <button
          onClick={reset}
          className="px-4 py-2 bg-deep-blue text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
} 