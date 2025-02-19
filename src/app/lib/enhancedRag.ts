import { createClient } from '@supabase/supabase-js';
import { generateEmbedding } from './enhancedSearch';

// Debug environment variables (safely)
console.log('\nDEBUG: Environment Check');
console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
console.log('SUPABASE_KEY exists:', !!process.env.SUPABASE_KEY);
console.log('SUPABASE_URL prefix:', process.env.SUPABASE_URL?.substring(0, 8));

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

export interface AcademicChunk {
  id: string;
  content: string;
  metadata: {
    type: string;
    category?: string;
    course_id?: string;
    title?: string;
    department?: string;
    level?: string | number;
  };
}

interface SearchChunk extends AcademicChunk {
  similarity: number;
}

export async function fetchCourseChunks(
  financeCoreIds: string[],
  financeElectivesNeeded: boolean,
  missingGenEdCategories: string[]
): Promise<AcademicChunk[]> {
  const chunks: AcademicChunk[] = [];
  
  // Debug: Test Supabase connection
  console.error('\n🔍 DEBUG: Testing Supabase Connection 🔍');
  try {
    const { data, error } = await supabase
      .from('academic_chunks')
      .select('count');
    
    if (error) {
      console.error('❌ Connection test error:', error);
    } else {
      console.error('✅ Connection successful, table exists');
      console.error('📊 Total rows in academic_chunks:', data);
    }
  } catch (e) {
    console.error('❌ Failed to connect to Supabase:', e);
  }
  
  // Fetch finance core chunks
  if (financeCoreIds.length > 0) {
    console.error('\n📚 Fetching core chunks for:', financeCoreIds);
    const { data: coreChunks, error: coreError } = await supabase
      .from('academic_chunks')
      .select('*')
      .eq('metadata->>type', 'course')
      .in('metadata->>department', financeCoreIds.map(id => id.substring(0, 3)))  // Get department code (e.g., BUS)
      .in('metadata->>level', financeCoreIds.map(id => parseInt(id.substring(3)))); // Get course number (e.g., 311)
      
    if (coreError) {
      console.error('❌ Error fetching core chunks:', coreError);
    } else {
      console.error('📊 Retrieved core chunks:', coreChunks?.length || 0);
      if (coreChunks) chunks.push(...coreChunks);
    }
  }

  // Fetch finance elective chunks
  if (financeElectivesNeeded) {
    console.error('📚 Fetching finance elective chunks');
    const { data: electiveChunks, error: electiveError } = await supabase
      .from('academic_chunks')
      .select('*')
      .eq('metadata->>type', 'course')
      .eq('metadata->>department', 'BUS')
      .gte('metadata->>level', 300)  // Upper-level business courses
      .not('metadata->>level', 'in', ['311', '320', '370', '379', '480', '489', '490']); // Exclude core courses
      
    if (electiveError) {
      console.error('❌ Error fetching elective chunks:', electiveError);
    } else {
      console.error('📊 Retrieved elective chunks:', electiveChunks?.length || 0);
      if (electiveChunks) chunks.push(...electiveChunks);
    }
  }

  // Fetch gen ed chunks
  for (const category of missingGenEdCategories) {
    if (!category) continue;
    console.error('📚 Fetching gen ed chunks for category:', category);
    
    // Use semantic search to find relevant courses
    console.error('🔍 Using semantic search for gen ed courses...');
    const searchQuery = `${category} course`;  // Simpler query
    console.error('🔍 Search query:', searchQuery);
    
    const { data: semanticChunks, error: semanticError } = await supabase
      .rpc('match_chunks', {
        query_embedding: await generateEmbedding(searchQuery),
        match_threshold: 0.5, // Even lower threshold
        match_count: 20 // Get more results to filter
      });
      
    if (semanticError) {
      console.error(`❌ Error in semantic search for ${category}:`, semanticError);
    } else if (semanticChunks) {
      console.error(`📊 Raw semantic matches: ${semanticChunks.length}`);
      if (semanticChunks.length > 0) {
        console.error('📝 Top 3 raw matches:');
        semanticChunks.slice(0, 3).forEach((chunk: SearchChunk) => {
          console.error(`- Score: ${chunk.similarity}`);
          console.error(`  Type: ${chunk.metadata?.type}`);
          console.error(`  Content: ${chunk.content.substring(0, 100)}...`);
        });
      }

      // Filter to only include course chunks and exclude BUS courses for gen eds
      const courseChunks = semanticChunks.filter((chunk: AcademicChunk) => {
        const metadata = chunk.metadata;
        
        // Try to extract course info from content if metadata is incomplete
        if (metadata?.type === 'course' && chunk.content.startsWith('Course:')) {
          const courseMatch = chunk.content.match(/Course: ([A-Z]{2,4}) (\d{3})/);
          if (courseMatch) {
            const [, dept, number] = courseMatch;  // Use , to skip first element
            // Add extracted info to metadata
            metadata.department = dept;
            metadata.course_id = `${dept}${number}`;
            console.error(`📝 Extracted course info: ${metadata.course_id}`);
          }
        }

        const isValid = (metadata?.type === 'course' && 
                        metadata?.department !== 'BUS' &&
                        metadata?.course_id) ||
                       // Also include gen_ed type chunks that list courses
                       (metadata?.type === 'gen_ed' && 
                        chunk.content.includes('Course') &&
                        !chunk.content.toLowerCase().includes('business'));
                        
        if (!isValid) {
          console.error(`❌ Filtered out: ${metadata?.type} - ${metadata?.department} ${metadata?.course_id}`);
          console.error(`  Preview: ${chunk.content.substring(0, 100)}...`);
        }
        return isValid;
      });

      console.error(`📊 Found ${courseChunks.length} potential courses for ${category}`);
      if (courseChunks.length > 0) {
        console.error('📝 Sample matches:');
        courseChunks.slice(0, 3).forEach((chunk: AcademicChunk) => {
          if (chunk.metadata.type === 'course') {
            console.error(`- ${chunk.metadata.course_id}: ${chunk.content.substring(0, 100)}...`);
          } else {
            // For gen_ed chunks, extract course list
            const courses = chunk.content.match(/[A-Z]{2,4}\d{3}/g) || [];
            console.error(`- Course list: ${courses.join(', ')}`);
            console.error(`  Preview: ${chunk.content.substring(0, 100)}...`);
          }
        });
        chunks.push(...courseChunks.slice(0, 5)); // Only take top 5 matches
      }
    }
  }

  return chunks;
}

export function formatChunksForLLM(chunks: AcademicChunk[]): string {
  // Group chunks by type
  const groupedChunks: { [key: string]: AcademicChunk[] } = {};
  
  chunks.forEach(chunk => {
    const type = chunk.metadata.type;
    if (!groupedChunks[type]) {
      groupedChunks[type] = [];
    }
    groupedChunks[type].push(chunk);
  });

  // Format the chunks into a readable string
  let result = '## Relevant Course Information\n\n';

  Object.entries(groupedChunks).forEach(([type, typeChunks]) => {
    result += `### ${type.toUpperCase()}\n`;
    
    typeChunks.forEach(chunk => {
      const courseId = chunk.metadata.course_id || '';
      const title = chunk.metadata.title || '';
      result += `- **${courseId}${title ? ` - ${title}` : ''}**: ${chunk.content}\n`;
    });
    
    result += '\n';
  });

  return result;
}

export function shouldUseTargetedRetrieval(userMessage: string): boolean {
  const schedulingKeywords = [
    'next semester',
    'schedule',
    'sign up',
    'register',
    'take next',
    'should take',
    'recommend',
    'suggestion'
  ];
  
  return schedulingKeywords.some(keyword => 
    userMessage.toLowerCase().includes(keyword.toLowerCase())
  );
}

export interface CourseResult {
  id: string;
  title: string;
  credits: number;
  relevance?: string;
}

export const queryRAG = async (query: string): Promise<CourseResult[]> => {
  try {
    // For now, return mock data until RAG system is fully implemented
    const mockCourses: Record<string, CourseResult[]> = {
      'values and ethical reasoning': [
        {
          id: 'PHIL240',
          title: 'Business Ethics',
          credits: 3,
          relevance: 'Directly relates to ethical considerations in venture capital and business'
        },
        {
          id: 'PHIL220',
          title: 'Ethics in Technology',
          credits: 3,
          relevance: 'Explores ethical implications of technology in business'
        },
        {
          id: 'PHIL260',
          title: 'Social & Political Philosophy',
          credits: 3,
          relevance: 'Examines ethical frameworks relevant to business decision-making'
        }
      ],
      'world cultures': [
        {
          id: 'BUS303',
          title: 'International Business',
          credits: 3,
          relevance: 'Understand global business practices and venture capital markets'
        },
        {
          id: 'ANTH240',
          title: 'Business Anthropology',
          credits: 3,
          relevance: 'Study how cultural differences impact business practices'
        },
        {
          id: 'HIST280',
          title: 'History of Global Markets',
          credits: 3,
          relevance: 'Learn about the development of international financial systems'
        }
      ],
      'individual and society': [
        {
          id: 'SOC250',
          title: 'Business and Society',
          credits: 3,
          relevance: 'Examine how businesses impact and are shaped by society'
        },
        {
          id: 'PSY230',
          title: 'Industrial Psychology',
          credits: 3,
          relevance: 'Understanding human behavior in business contexts'
        },
        {
          id: 'SOC280',
          title: 'Organizations and Leadership',
          credits: 3,
          relevance: 'Study organizational behavior and leadership styles'
        }
      ]
    };

    // Find the most relevant category based on the query
    const category = Object.keys(mockCourses).find(cat => 
      query.toLowerCase().includes(cat.toLowerCase())
    );

    return category ? mockCourses[category] : [];
  } catch (error) {
    console.error('Error querying RAG system:', error);
    return [];
  }
} 