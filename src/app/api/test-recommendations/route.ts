import { getRecommendedCourses } from '@/app/lib/functions/recommendedCourses';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Use a hardcoded student ID for testing
    const studentId = '3029e6f2-ee85-4ae3-8ace-578cb7314567';
    
    // Get course recommendations
    const recommendations = await getRecommendedCourses(studentId);
    
    // Return the recommendations
    return NextResponse.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Error in test-recommendations API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 