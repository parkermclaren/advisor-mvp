/*  */import { NextResponse } from 'next/server';
import { calculateDegreeProgress } from '../../lib/degreeProgress';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentName = searchParams.get('student');

    if (!studentName) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      );
    }

    const progress = await calculateDegreeProgress(studentName);
    return NextResponse.json(progress);
  } catch (error) {
    console.error('Error in degree progress endpoint:', error);
    return NextResponse.json(
      { error: 'Failed to calculate degree progress' },
      { status: 500 }
    );
  }
} 