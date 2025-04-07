import { buildOptimizedSchedule } from '@/app/lib/functions/optimizedScheduleBuilder';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { studentId, term } = await request.json();

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      );
    }

    if (!term) {
      return NextResponse.json(
        { error: 'Term is required' },
        { status: 400 }
      );
    }

    const schedule = await buildOptimizedSchedule(studentId, term);

    return NextResponse.json({ 
      schedule,
      message: 'Schedule built successfully with optimized course selection and conflict resolution'
    });
  } catch (error) {
    console.error('Error in schedule builder API:', error);
    return NextResponse.json(
      { error: 'Failed to build schedule' },
      { status: 500 }
    );
  }
} 