import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Add generateEmbedding function
export async function generateEmbedding(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "text-embedding-ada-002",
            input: text.replace(/\n/g, " ")
        })
    });

    const data = await response.json();
    return data.data[0].embedding;
}

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
        console.log('\n=== RAG Process Start ===');
        
        // Query Processing Stage
        console.log('\n=== Query Processing Stage ===');
        console.log('Original Query:', query);
        
        // Enhance the query to specifically look for relevant requirements and courses
        const enhancedQuery = `
            Given a student who:
            - Has completed: ${options.completedCourses.map(c => c.course_code).join(', ')}
            - Is a ${options.standing}
            - In the ${options.program} program
            - Has a ${options.gpa} GPA
            
            ${query}
        `;
        console.log('Enhanced Query:', enhancedQuery);
        console.log('Query Length (chars):', enhancedQuery.length);

        // Generate embeddings for the enhanced query
        console.log('\n=== Embedding Generation Stage ===');
        console.log('Generating embedding using text-embedding-ada-002...');
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
        console.log('Embedding Generated Successfully');
        console.log('Embedding Dimensions:', embedding.length);

        // Retrieval Stage
        console.log('\n=== Retrieval Stage ===');
        console.log('Match Parameters:');
        console.log('- Threshold:', 0.5);
        console.log('- Max Chunks:', 25);
        
        const { data: chunks, error: matchError } = await supabase
            .rpc('match_chunks', {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 25
            });

        if (matchError) {
            console.error('Error in match_chunks RPC:', matchError);
            throw matchError;
        }

        console.log(`Retrieved ${chunks?.length || 0} initial chunks`);
        console.log('\nTop 5 Chunks by Similarity:');
        chunks?.slice(0, 5).forEach((chunk: SearchResult, index: number) => {
            console.log(`\n${index + 1}. ${chunk.title}`);
            console.log(`   Similarity: ${chunk.similarity.toFixed(4)}`);
            console.log(`   Type: ${chunk.metadata?.type}`);
            console.log(`   Category: ${chunk.metadata?.category || 'N/A'}`);
            console.log(`   Content Preview: ${chunk.content.substring(0, 100)}...`);
        });

        // Filtering Stage
        console.log('\n=== Filtering Stage ===');
        const completedCourseCodes = new Set(options.completedCourses.map(c => c.course_code));
        console.log('Completed Course Codes:', Array.from(completedCourseCodes));

        const filteredChunks = chunks.filter((chunk: SearchResult) => {
            if (chunk.metadata?.type === 'course') {
                const courseCode = chunk.title.split(':')[0];
                const isFiltered = !completedCourseCodes.has(courseCode);
                if (!isFiltered) {
                    console.log(`Filtered out completed course: ${courseCode}`);
                }
                return isFiltered;
            }
            return true;
        });

        console.log(`\nAfter Filtering:`);
        console.log(`- Original Chunks: ${chunks.length}`);
        console.log(`- Filtered Chunks: ${filteredChunks.length}`);
        console.log(`- Removed: ${chunks.length - filteredChunks.length} chunks`);

        // Categorization Analysis
        console.log('\n=== Chunk Categorization ===');
        const categorizedChunks = new Map<string, SearchResult[]>();
        filteredChunks.forEach((chunk: SearchResult) => {
            const category = chunk.metadata?.category || chunk.metadata?.type || 'Other';
            if (!categorizedChunks.has(category)) {
                categorizedChunks.set(category, []);
            }
            categorizedChunks.get(category)?.push(chunk);
        });

        console.log('Chunks by Category:');
        categorizedChunks.forEach((chunks, category) => {
            console.log(`${category}: ${chunks.length} chunks`);
        });

        // Context Building Analysis
        console.log('\n=== Context Building Analysis ===');
        const totalContentLength = filteredChunks.reduce((acc: number, chunk: SearchResult) => 
            acc + chunk.content.length, 0);
        console.log('Total Content Length:', totalContentLength, 'characters');
        console.log('Estimated Tokens:', Math.ceil(totalContentLength / 4));

        console.log('\n=== RAG Process Complete ===\n');

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