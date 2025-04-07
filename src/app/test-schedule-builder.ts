/**
 * Test script for the schedule builder API
 * Run with: npx ts-node -r tsconfig-paths/register src/app/test-schedule-builder.ts
 */

async function testScheduleBuilder() {
  try {
    console.log('Testing schedule builder API...');
    
    const response = await fetch('http://localhost:3000/api/schedule-builder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        studentId: 'f7cf1831-9985-4588-ae20-3515eb82f8d9',
        term: 'Spring 2025',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Schedule builder response:');
    console.log(JSON.stringify(data, null, 2));
    
    // Print some summary information
    const schedule = data.schedule;
    console.log(`\nSchedule Summary:`);
    console.log(`Total credits: ${schedule.total_credits}`);
    console.log(`Number of courses: ${schedule.sections.length}`);
    console.log(`Early morning classes: ${schedule.schedule_stats.early_morning_classes}`);
    console.log(`Back-to-back classes: ${schedule.schedule_stats.back_to_back_classes}`);
    
    // Print conflicts if any
    if (schedule.schedule_conflicts && schedule.schedule_conflicts.length > 0) {
      console.log(`\nSchedule Conflicts:`);
      schedule.schedule_conflicts.forEach((conflict: any) => {
        console.log(`- ${conflict.description} (Severity: ${conflict.severity})`);
      });
    }
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Error testing schedule builder:', error);
  }
}

// Run the test
testScheduleBuilder(); 