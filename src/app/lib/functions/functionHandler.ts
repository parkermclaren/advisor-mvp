import { maxProgress } from '../studentData';
import { getCoursesByCategory } from './getCoursesByCategory';
import { buildOptimizedSchedule } from './optimizedScheduleBuilder';
import { getRecommendedCourses } from './recommendedCourses';
import { getRemainingRequirements } from './remainingRequirements';
import { getCompletedCourses } from './studentCourses';

// Define a type for the functions in our map
type FunctionType = (...args: unknown[]) => Promise<unknown>;

/**
 * A map of function names to their implementations
 */
const functionMap: Record<string, FunctionType> = {
  getCompletedCourses: getCompletedCourses as FunctionType,
  getRemainingRequirements: getRemainingRequirements as FunctionType,
  getRecommendedCourses: getRecommendedCourses as FunctionType,
  getCoursesByCategory: getCoursesByCategory as FunctionType,
  buildStudentSchedule: buildOptimizedSchedule as FunctionType
};

/**
 * Execute a function by name with the given arguments
 * @param functionName The name of the function to execute
 * @param args The arguments to pass to the function
 * @returns The result of the function execution
 */
export async function executeFunction(functionName: string, args: Record<string, unknown>) {
  // Check if the function exists in our map
  if (functionName in functionMap) {
    try {
      // For functions that require studentId, use the current student's ID if not provided
      if (functionName === 'getCompletedCourses' || 
          functionName === 'getRemainingRequirements' ||
          functionName === 'getRecommendedCourses') {
        const studentId = (args.studentId as string) || maxProgress.student_summary.id;
        return await functionMap[functionName](studentId);
      }
      
      // Special handling for buildStudentSchedule
      if (functionName === 'buildStudentSchedule') {
        const studentId = (args.studentId as string) || maxProgress.student_summary.id;
        const term = (args.term as string) || 'Spring 2025'; // Default to Spring 2025 if not provided
        
        console.log(`Executing optimized schedule builder for student ${studentId} and term ${term}`);
        return await functionMap[functionName](studentId, term);
      }
      
      // Special handling for getCoursesByCategory to ensure parameters are correct
      if (functionName === 'getCoursesByCategory') {
        // Ensure categoryName is a string
        const categoryName = typeof args.categoryName === 'string' 
          ? args.categoryName 
          : String(args.categoryName || 'Finance Electives');
        
        // Ensure limit is a number
        const limit = typeof args.limit === 'number' 
          ? args.limit 
          : (parseInt(args.limit as string, 10) || 5);
        
        // Ensure personalize is a boolean
        const personalize = typeof args.personalize === 'boolean'
          ? args.personalize
          : args.personalize !== 'false'; // Default to true unless explicitly set to 'false'
        
        // Ensure offset is a number
        const offset = typeof args.offset === 'number'
          ? args.offset
          : (parseInt(args.offset as string, 10) || 0);
        
        console.log(`Executing getCoursesByCategory with categoryName: "${categoryName}" (${typeof categoryName}), limit: ${limit}, personalize: ${personalize}, offset: ${offset}`);
        return await functionMap[functionName](categoryName, limit, personalize, offset);
      }
      
      // For other functions, pass all arguments
      return await functionMap[functionName](args);
    } catch (error) {
      console.error(`Error executing function ${functionName}:`, error);
      throw error;
    }
  } else {
    throw new Error(`Function ${functionName} not found`);
  }
} 