# AI Academic Advisor

An AI-powered academic advisor system for Endicott College using RAG (Retrieval-Augmented Generation) architecture.

## Project Structure

```
advisor-mvp/
├── rag_pipeline/         # Data pipeline for processing academic content
│   ├── scrapers/        # Web scrapers for course catalog and requirements
│   ├── processors/      # Content processing and chunking logic
│   ├── embeddings/      # Vector embedding generation
│   └── database/        # Supabase database management
├── src/                 # Next.js application
│   ├── app/            # App router components
│   └── components/     # Reusable React components
```

## Features

- Course catalog exploration with semantic search
- General Education requirements lookup
- Program-specific requirements (Finance major)
- Natural language query interface
- Contextual course recommendations

## Tech Stack

- Next.js 13+ (App Router)
- Supabase (Vector Store)
- OpenAI (GPT-4 + Embeddings)
- TailwindCSS
- Puppeteer (Web Scraping)

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
4. Run the development server:
   ```bash
   npm run dev
   ```

## Data Pipeline

To process academic content:

1. Run course catalog scraper:
   ```bash
   cd rag_pipeline
   node test_course_catalog.js
   ```

2. Process Gen Ed requirements:
   ```bash
   node test_gen_ed_pipeline.js
   ```

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## Environment Variables

Required environment variables:
- `OPENAI_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_KEY`
