'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { maxProgress } from '../lib/studentData';

interface Recommendation {
  course_id: string;
  metadata: {
    title: string;
    type: string;
    category?: string;
    explanation?: string;
  };
  credits: number;
  reason: string;
  priority: number;
  recommendation_type: 'core' | 'gen_ed' | 'elective';
  alignment_score: number;
}

interface RecommendationContext {
  core_credits: number;
  remaining_credits: number;
  incomplete_requirements: {
    financeCoreRemaining: string[];
    financeElectivesNeeded: boolean;
    genEdCategoriesMissing: string[];
  };
}

interface RecommendationResponse {
  recommendations: Recommendation[];
  context: RecommendationContext;
}

export default function CourseRecommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [context, setContext] = useState<RecommendationContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentElectiveIndex, setCurrentElectiveIndex] = useState(0);
  const [currentGenEdIndex, setCurrentGenEdIndex] = useState(0);

  useEffect(() => {
    const fetchRecommendations = async () => {
      try {
        // Add timestamp to force fresh recommendations
        const response = await fetch('/api/recommendations?t=' + Date.now());
        if (!response.ok) {
          throw new Error('Failed to fetch recommendations');
        }
        const data: RecommendationResponse = await response.json();
        console.log('Fetched recommendations:', data);
        
        if (!data.recommendations || data.recommendations.length === 0) {
          console.error('No recommendations received from API');
          setError('No recommendations available');
          return;
        }

        // Log the types of recommendations we received
        const types = data.recommendations.reduce((acc: Record<string, number>, rec) => {
          acc[rec.recommendation_type] = (acc[rec.recommendation_type] || 0) + 1;
          return acc;
        }, {});
        console.log('Recommendation types received:', types);
        
        setRecommendations(data.recommendations || []);
        setContext(data.context);
      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    console.log('Fetching recommendations...');
    fetchRecommendations();
  }, []);

  if (loading) {
    return (
      <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] animate-pulse">
        <div className="h-6 bg-white/50 rounded-full w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/50 rounded-full w-5/6"></div>
          <div className="h-4 bg-white/50 rounded-full w-4/6"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/25 backdrop-blur-xl border border-red-200/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
        <p className="text-red-600">Error loading recommendations: {error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)]">
        <p className="text-gray-600">No course recommendations available for next semester.</p>
      </div>
    );
  }

  const coreRecommendations = recommendations.filter(r => r.recommendation_type === 'core');
  const genEdRecommendations = recommendations.filter(r => r.recommendation_type === 'gen_ed');
  const electiveRecommendations = recommendations.filter(r => r.recommendation_type === 'elective');

  const handleSwipe = (direction: 'left' | 'right', type: 'elective' | 'gen_ed') => {
    if (type === 'elective') {
      const maxIndex = electiveRecommendations.length - 1;
      if (direction === 'left') {
        setCurrentElectiveIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
      } else {
        setCurrentElectiveIndex(prev => (prev < maxIndex ? prev + 1 : 0));
      }
    } else {
      const maxIndex = genEdRecommendations.length - 1;
      if (direction === 'left') {
        setCurrentGenEdIndex(prev => (prev > 0 ? prev - 1 : maxIndex));
      } else {
        setCurrentGenEdIndex(prev => (prev < maxIndex ? prev + 1 : 0));
      }
    }
  };

  const SwipeableCard = ({ recommendation, type }: { recommendation: Recommendation, type: 'elective' | 'gen_ed' }) => (
    <motion.div
      key={recommendation.course_id}
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ duration: 0.3 }}
      className="relative bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl p-6"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-xl font-['Fraunces'] text-deep-blue mb-2">
            {recommendation.course_id}: {recommendation.metadata.title}
          </h3>
          <p className="text-gray-600 mb-4">{recommendation.reason}</p>
          <div className="flex items-center gap-3">
            <span className="bg-blue-50/50 backdrop-blur-xl text-blue-800 px-3 py-1.5 rounded-full text-sm border border-blue-100/50">
              {recommendation.credits} credits
            </span>
            <span className="bg-purple-50/50 text-purple-800 px-3 py-1.5 rounded-full text-sm border border-purple-100/50">
              Alignment: {Math.round(recommendation.alignment_score * 100)}%
            </span>
          </div>
        </div>
      </div>
      
      {/* Swipe Controls */}
      <div className="absolute inset-y-0 left-0 flex items-center">
        <button
          onClick={() => handleSwipe('left', type)}
          className="p-2 rounded-full bg-white/50 hover:bg-white/75 transition-colors -ml-4"
        >
          <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      <div className="absolute inset-y-0 right-0 flex items-center">
        <button
          onClick={() => handleSwipe('right', type)}
          className="p-2 rounded-full bg-white/50 hover:bg-white/75 transition-colors -mr-4"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </motion.div>
  );

  return (
    <div className="bg-white/25 backdrop-blur-xl border border-white/50 rounded-3xl p-8 shadow-[0_8px_32px_0_rgba(31,41,55,0.1)] mt-6">
      <h2 className="text-2xl font-['Fraunces'] font-normal text-deep-blue tracking-[-0.02em] leading-tight mb-6">
        Recommended Schedule for {maxProgress.current_term.next_registration_term}
      </h2>

      {/* Credit Load Summary */}
      {context && (
        <div className="mb-8 bg-blue-50/50 backdrop-blur-xl border border-blue-100/50 rounded-2xl p-6">
          <h3 className="text-lg font-['Fraunces'] text-deep-blue mb-2">Recommended Course Load</h3>
          <p className="text-gray-600">
            For a balanced schedule next semester, we recommend taking your required core courses 
            ({context.core_credits} credits) plus 1-2 additional courses for a total of 15-16 credits.
          </p>
        </div>
      )}

      {/* Required Core Courses Section */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-['Fraunces'] text-deep-blue">Step 1: Required Core Courses</h3>
          <span className="bg-red-50/50 text-red-800 px-3 py-1 rounded-full text-sm border border-red-100/50">
            Must Take
          </span>
        </div>
        <p className="text-gray-600 mb-4">Start by registering for these required core courses:</p>
        <div className="space-y-4">
          {coreRecommendations.map((rec) => (
            <div key={rec.course_id} className="bg-white/50 backdrop-blur-xl border border-white/50 rounded-2xl p-6">
              <h3 className="text-xl font-['Fraunces'] text-deep-blue mb-2">
                {rec.course_id}: {rec.metadata.title}
              </h3>
              <p className="text-gray-600 mb-4">{rec.reason}</p>
              <div className="flex items-center gap-3">
                <span className="bg-blue-50/50 backdrop-blur-xl text-blue-800 px-3 py-1.5 rounded-full text-sm border border-blue-100/50">
                  {rec.credits} credits
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Additional Recommended Courses Section */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-xl font-['Fraunces'] text-deep-blue">Step 2: Additional Recommended Courses</h3>
          <span className="bg-green-50/50 text-green-800 px-3 py-1 rounded-full text-sm border border-green-100/50">
            Choose 1-2
          </span>
        </div>
        <p className="text-gray-600 mb-6">
          To complete your schedule, choose 1-2 of these recommended courses based on your interests and remaining credit capacity:
        </p>
        
        {/* Finance Electives Section */}
        {electiveRecommendations.length > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-['Fraunces'] text-deep-blue mb-4">Finance Electives</h4>
            <AnimatePresence mode="wait" key="elective-animation">
              <SwipeableCard 
                recommendation={electiveRecommendations[currentElectiveIndex]} 
                type="elective"
              />
            </AnimatePresence>
            <div className="mt-2 text-center text-sm text-gray-500">
              {currentElectiveIndex + 1} of {electiveRecommendations.length}
            </div>
          </div>
        )}

        {/* Gen Ed Section */}
        {genEdRecommendations.length > 0 && (
          <div className="mb-8">
            <h4 className="text-lg font-['Fraunces'] text-deep-blue mb-4">General Education Options</h4>
            <AnimatePresence mode="wait" key="gened-animation">
              <SwipeableCard 
                recommendation={genEdRecommendations[currentGenEdIndex]} 
                type="gen_ed"
              />
            </AnimatePresence>
            <div className="mt-2 text-center text-sm text-gray-500">
              {currentGenEdIndex + 1} of {genEdRecommendations.length}
            </div>
          </div>
        )}
      </div>

      {/* Credit Summary Footer */}
      {context && (
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex items-center justify-between text-gray-600">
            <span>Core Course Credits: {context.core_credits}</span>
            <span className="font-medium">Target: 15-16 total credits</span>
            <span>Maximum: 18 credits</span>
          </div>
        </div>
      )}
    </div>
  );
}