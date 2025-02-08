import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SearchOptions {
    completedCourses: Array<{
        course_code: string;
        grade: string;
    }>;
    standing: string;
    gpa: number;
    program: string;
}

interface SearchResult {
    content: string;
    title: string;
    similarity: number;
    metadata?: {
        category?: string;
        type?: string;
    };
}

export async function performEnhancedSearch(
    query: string,
    options: SearchOptions
): Promise<SearchResult[]> {
    try {
        // Enhance the query to specifically look for relevant requirements and courses
        const enhancedQuery = `
            Given a student who:
            - Has completed: ${options.completedCourses.map(c => c.course_code).join(', ')}
            - Is a ${options.standing}
            - In the ${options.program} program
            - Has a ${options.gpa} GPA
            
            ${query}
        `;

        // Generate embeddings for the enhanced query
        const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "text-embedding-ada-002",
                input: enhancedQuery
            })
        });

        const embeddingData = await embeddingResponse.json();
        const embedding = embeddingData.data[0].embedding;

        // Search for relevant chunks with a higher match count to get comprehensive context
        const { data: chunks, error: matchError } = await supabase
            .rpc('match_chunks', {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 25 // Increased to get more context
            });

        if (matchError) throw matchError;

        // Filter out completed courses
        const completedCourseCodes = new Set(options.completedCourses.map(c => c.course_code));
        const filteredChunks = chunks.filter((chunk: SearchResult) => {
            if (chunk.metadata?.type === 'course') {
                const courseCode = chunk.title.split(':')[0];
                return !completedCourseCodes.has(courseCode);
            }
            return true;
        });

        return filteredChunks;
    } catch (error) {
        console.error('Error in enhanced search:', error);
        return [];
    }
}

export function formatSearchResults(results: SearchResult[]): string {
    let formattedResults = '';
    
    // Group results by category
    const categoryMap = new Map<string, SearchResult[]>();
    
    results.forEach(result => {
        const category = result.metadata?.category || result.metadata?.type || 'Other';
        if (!categoryMap.has(category)) {
            categoryMap.set(category, []);
        }
        categoryMap.get(category)?.push(result);
    });

    // Format each category
    categoryMap.forEach((categoryResults, category) => {
        formattedResults += `\n${category.toUpperCase()}:\n`;
        categoryResults.forEach(result => {
            formattedResults += `- ${result.title}: ${result.content}\n`;
        });
    });

    return formattedResults;
} 