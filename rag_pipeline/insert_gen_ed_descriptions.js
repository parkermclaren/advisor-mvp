const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey
});

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

const categoryDescriptions = [
  {
    category: "Individual and Society",
    description: "Courses in this category give students an understanding of how societies form, evolve, and sustain themselves through the continuing interplay between the individual and the group. Students explore issues related to human development, personal identity, group dynamics, social and institutional change, and cultural diversity. Civic engagement and responsibility are emphasized."
  },
  {
    category: "Global Issues",
    description: "Courses in this category prompt students to examine topics such as politics, the environment, technology, history, health, and economics from an internationally guided approach. Students study how various social, religious, political, and economic systems and movements influence international relations and the global economy. Contemporary relevant issues will be addressed."
  },
  {
    category: "Literary Perspectives",
    description: "Courses in this category provide exposure to a variety of genres and styles of writing, both past and present. Students learn to engage and respond critically to texts by extracting meaning and analyzing themes, concepts, and stylistic elements. In addition, students develop their own academic writing skills, effectively organizing, supporting, and expressing their ideas with an awareness of audience, purpose, and the conventions of the written language."
  },
  {
    category: "Values and Ethical Reasoning",
    description: "Courses in this category address the ways in which values and decisions constantly affect us at individual and collective levels. Students explore the sources of our values in both personal experience and in various forms of tradition such as religion, law, philosophy, art, and professional practice. In addition, students examine the forms of critical evaluation and choice that we employ to decide between better and worse courses of action in our own lives and in our interactions with others."
  },
  {
    category: "Aesthetic Awareness and Creative Expression",
    description: "Courses in this category focus on the development of an aesthetic responsiveness to a variety of creative art forms including the visual arts, poetry, drama, music, and dance. Concepts and fundamental issues of aesthetics from historical, theoretical, and creative perspectives are considered. Students gain an understanding of the conventional designations of stylistic periods, explore both personal and cultural concepts of aesthetics, and develop their own creative works and vision. (Students must complete a minimum of three credits by completing either one three-credit course or three one-credit courses.)"
  },
  {
    category: "Quantitative Reasoning",
    description: "Courses in this category develop quantitative reasoning, the application of mathematical concepts and skills to formulate, analyze, and solve real-world problems. In order to perform effectively as professionals and citizens, students will become competent in reading and using numerical information, in understanding the implications of quantitative evidence, and in applying mathematical skills and techniques to obtain solutions to unknown problems."
  },
  {
    category: "Science and Technology",
    description: "Courses in this category involve an exploration of living organisms, the physical world, and technology. Students engage in the process of scientific inquiry, experimentation, and discovery. In addition, they discuss and evaluate a range of globally related issues such as climate change, sustainability, world health, and technological advances and challenges."
  },
  {
    category: "World Cultures",
    description: "Courses in this category focus on past and contemporary cultures through the study of a people's history, beliefs, values, language, lifestyles, arts, and political and social institutions. Students gain an understanding and appreciation of the cultural perspectives of others in American society and in the world. Study abroad experiences are encouraged as a way for students to experience first-hand the rich cultural diversity of our world."
  },
  {
    category: "Writing Designated",
    description: "Before graduating, students must earn six writing credits in addition to ENG111 Critical Reading & Writing I and ENG112 Critical Reading & Writing II with one course at the 200-level or higher."
  }
];

async function insertCategoryDescriptions() {
  try {
    console.log('Starting to process category descriptions...');

    for (const cat of categoryDescriptions) {
      console.log(`\nProcessing category: ${cat.category}`);

      // Create chunk
      const chunk = {
        title: `Gen Ed Category: ${cat.category}`,
        content: `${cat.category}\n${cat.description}`,
        metadata: {
          type: "gen_ed",
          subtype: "category_description",
          category: cat.category
        }
      };

      // Generate embedding
      console.log('Generating embedding...');
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-ada-002",
        input: chunk.content,
      });
      chunk.embedding = embeddingResponse.data[0].embedding;
      console.log(`Generated embedding of length: ${chunk.embedding.length}`);

      // Insert into Supabase
      console.log('Inserting into Supabase...');
      const { data, error } = await supabase
        .from('academic_chunks')
        .insert([{
          title: chunk.title,
          content: chunk.content,
          metadata: chunk.metadata,
          embedding: chunk.embedding
        }]);

      if (error) {
        console.error(`Error inserting ${cat.category}:`, error);
      } else {
        console.log(`Successfully inserted ${cat.category}`);
      }
    }

    console.log('\nFinished processing all categories!');
  } catch (error) {
    console.error('Error in insertCategoryDescriptions:', error);
  }
}

// Run the insertion
insertCategoryDescriptions(); 