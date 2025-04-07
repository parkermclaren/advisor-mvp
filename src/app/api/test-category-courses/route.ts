import { getCoursesByCategory } from '@/app/lib/functions/getCoursesByCategory';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    // Get the category name from the query parameters
    const url = new URL(request.url);
    const categoryName = url.searchParams.get('category') || 'Finance Electives';
    const limit = parseInt(url.searchParams.get('limit') || '5', 10);
    const personalize = url.searchParams.get('personalize') !== 'false'; // Default to true
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);
    
    console.log(`API Request: category=${categoryName}, limit=${limit}, personalize=${personalize}, offset=${offset}`);
    
    // Get courses for the specified category
    const result = await getCoursesByCategory(categoryName, limit, personalize, offset);
    
    // Return the results
    return NextResponse.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error in test-category-courses API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 