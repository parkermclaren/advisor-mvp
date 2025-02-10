"use client"

import { useEffect, useState } from 'react';

interface ProgressDetails {
  totalRequiredCredits: number;
  totalCompletedCredits: number;
}

interface ProgressData {
  progress: number;
  details: ProgressDetails;
}

export default function ProgressBar({ studentName = "Grenert, Max" }: { studentName?: string }) {
  const [progressData, setProgressData] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProgress() {
      try {
        const response = await fetch(`/api/degree-progress?student=${encodeURIComponent(studentName)}`);
        if (!response.ok) throw new Error('Failed to fetch progress');
        const data = await response.json();
        setProgressData(data);
      } catch (err) {
        console.error('Error fetching degree progress:', err);
        setError('Failed to load progress');
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgress();
  }, [studentName]);

  if (error) {
    return (
      <div className="w-full px-6 text-deep-blue/80">
        Error loading progress: {error}
      </div>
    );
  }

  if (isLoading || !progressData) {
    return (
      <div className="w-full px-6">
        <div className="flex justify-between text-sm text-deep-blue font-medium mb-2">
          <span>Degree Progress</span>
          <span>Loading...</span>
        </div>
        <div className="w-full h-6 bg-white/25 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]">
          <div className="h-full bg-deep-blue/40 backdrop-blur-xl rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6">
      <div className="flex justify-between text-sm text-deep-blue font-medium mb-2">
        <span>Degree Progress</span>
        <span>{progressData.progress}%</span>
      </div>
      <div className="w-full h-6 bg-white/25 backdrop-blur-xl border border-white/50 rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(255,255,255,0.15)] backdrop-saturate-[1.3]">
        <div 
          className="h-full bg-deep-blue/80 backdrop-blur-xl rounded-2xl transition-all duration-500 ease-out border-r border-white/20"
          style={{ width: `${progressData.progress}%` }}
        />
      </div>
      <div className="mt-1 text-xs text-deep-blue/70">
        {progressData.details.totalCompletedCredits} of {progressData.details.totalRequiredCredits} credits completed
      </div>
    </div>
  )
}
  
  