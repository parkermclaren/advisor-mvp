import { NextResponse } from 'next/server';
import { getRemainingRequirements } from '../../../lib/functions/remainingRequirements';
import { maxProgress } from '../../../lib/studentData';

export async function GET() {
  try {
    // Get the current student ID from maxProgress
    const studentId = maxProgress.student_summary.id;
    
    // Call the getRemainingRequirements function directly
    const result = await getRemainingRequirements(studentId);
    
    // Return the raw result
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to get remaining requirements' },
      { status: 500 }
    );
  }
} 