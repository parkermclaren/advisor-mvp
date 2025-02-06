# AI Advisor RAG Architecture

## Current Architecture

### Database Schema
```sql
CREATE TABLE academic_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT,
    content TEXT,
    metadata JSONB,
    embedding VECTOR(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Key Design Decisions

1. **Flexible JSONB Metadata**
   - Current usage:
     ```json
     {
       "type": "gen_ed",
       "subtype": "category_description",
       "category": "Individual and Society"
     }
     ```
   - Future extensibility:
     ```json
     {
       "type": "course",
       "course_code": "FIN301",
       "prerequisites": ["FIN201", "MATH201"],
       "schedule_reference": "2024_SPRING_FIN301_01",
       "last_offered": "2024-01-15",
       "student_eligibility_rules": ["junior_standing", "finance_major"]
     }
     ```

2. **Universal Embedding Format**
   - Using OpenAI's 1536-dimension embeddings
   - Compatible with future models and similarity search methods
   - Supports hybrid search strategies

3. **Content Chunking Strategy**
   - Current approach: GPT-4 intelligent chunking
   - Chunk size: Natural semantic boundaries
   - Context preservation: Complete thoughts and related information
   - Example chunk:
     ```text
     Title: "Gen Ed - Individual and Society Overview"
     Content: "Courses in this category give students an understanding..."
     ```

## Future Multi-Hop Architecture

### 1. Query Planning Layer
```typescript
interface QueryPlan {
  steps: {
    dataSource: string;
    queryType: 'embedding' | 'exact' | 'prerequisite' | 'schedule';
    priority: number;
    dependsOn?: string[];
  }[];
}

// Example plan for: "What Gen Ed courses could I take next semester that align with my interest in psychology?"
const samplePlan = {
  steps: [
    {
      dataSource: 'student_profile',
      queryType: 'exact',
      priority: 1
    },
    {
      dataSource: 'academic_chunks',
      queryType: 'embedding',
      priority: 2,
      filter: 'type = gen_ed'
    },
    {
      dataSource: 'course_schedule',
      queryType: 'schedule',
      priority: 3,
      dependsOn: ['step_1', 'step_2']
    }
  ]
};
```

### 2. Specialized Data Sources
Each with optimal retrieval methods:

1. **Academic Content** (Current)
   - Table: `academic_chunks`
   - Retrieval: Embedding similarity
   - Example query:
     ```sql
     SELECT * FROM academic_chunks
     WHERE metadata->>'type' = 'gen_ed'
     ORDER BY embedding <=> query_embedding
     LIMIT 3;
     ```

2. **Student Data** (Future)
   - Table: `student_profiles`
   - Retrieval: Exact match + graph traversal
   - Example query:
     ```sql
     WITH completed_courses AS (
       SELECT course_code 
       FROM student_transcripts 
       WHERE student_id = :id
     )
     SELECT available_courses.*
     FROM course_prerequisites
     LEFT JOIN completed_courses
     WHERE prerequisites <@ completed_courses;
     ```

3. **Course Schedules** (Future)
   - Table: `course_offerings`
   - Retrieval: Temporal + constraint-based
   - Example query:
     ```sql
     SELECT * FROM course_offerings
     WHERE semester = '2024SP'
     AND course_code = ANY(:eligible_courses)
     AND seats_available > 0;
     ```

### Implementation Strategy

1. **Phase 1 - Current MVP**
   - Single-hop RAG with academic content
   - Simple embedding similarity search
   - Basic metadata filtering

2. **Phase 2 - Enhanced Context**
   - Add student profile integration
   - Implement basic prerequisite checking
   - Keep single-hop architecture

3. **Phase 3 - Multi-Hop Implementation**
   - Add query planning layer
   - Integrate course schedules
   - Implement coordinator LLM
   - Example coordinator prompt:
     ```text
     Given the student query: "{user_query}"
     1. Determine required data sources
     2. Create query execution plan
     3. Synthesize information from multiple hops
     4. Generate coherent response
     ```

### Query Examples

1. **Current (Single-Hop)**
   ```typescript
   // "Tell me about Individual and Society courses"
   const results = await supabase.rpc('match_chunks', {
     query_embedding,
     match_threshold: 0.7,
     match_count: 3
   });
   ```

2. **Future (Multi-Hop)**
   ```typescript
   // "What Gen Ed courses could I take next semester based on my transcript?"
   const plan = await queryPlanner.createPlan(userQuery);
   const studentData = await fetchStudentProfile(studentId);
   const eligibleCourses = await checkPrerequisites(studentData.completedCourses);
   const relevantGenEds = await searchGenEdCourses(query_embedding);
   const availableSchedules = await findCourseOfferings(
     intersection(eligibleCourses, relevantGenEds)
   );
   ```

### Migration Path

1. **Keep Existing Data**
   - Current `academic_chunks` table remains unchanged
   - Existing embeddings stay valid
   - Scraping and chunking pipeline remains functional

2. **Add New Capabilities**
   - Implement new tables as needed
   - Create specialized retrievers
   - Add coordinator layer above existing RAG

3. **Performance Optimizations**
   - Add materialized views for common queries
   - Implement caching layer
   - Create specialized indices

### Best Practices

1. **Data Organization**
   - Keep atomic information in chunks
   - Use metadata for relationships
   - Maintain clear category boundaries

2. **Query Optimization**
   - Cache common embeddings
   - Use appropriate similarity thresholds
   - Implement result ranking

3. **Response Generation**
   - Maintain context across hops
   - Preserve source attribution
   - Handle conflicting information

## Monitoring and Maintenance

1. **Performance Metrics**
   - Query response times
   - Embedding generation latency
   - Cache hit rates

2. **Quality Metrics**
   - Response accuracy
   - Context relevance scores
   - User feedback tracking

3. **System Health**
   - Database connection pools
   - API rate limits
   - Error rates and types 