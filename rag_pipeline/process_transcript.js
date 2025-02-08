const { processTranscriptImages } = require('./processors/transcript_processor');
const { insertTranscriptData } = require('./database/transcript_manager');

/**
 * Main function to process transcript screenshots and insert data into the database
 * @param {Array<string>} imageUrls - Array of transcript screenshot URLs/base64 strings
 * @returns {Object} Object containing the inserted transcript and term IDs
 */
async function processAndInsertTranscript(imageUrls) {
  try {
    console.log('Starting transcript processing...');
    
    // Step 1: Process the transcript images
    console.log('Processing transcript images...');
    const transcriptData = await processTranscriptImages(imageUrls);
    console.log('Successfully extracted transcript data');
    
    // Step 2: Insert the data into Supabase
    console.log('Inserting transcript data into database...');
    const result = await insertTranscriptData(transcriptData);
    console.log('Successfully inserted transcript data');
    
    return result;
  } catch (error) {
    console.error('Error in transcript processing:', error);
    throw error;
  }
}

// If running directly (not imported as a module)
if (require.main === module) {
  // Example usage:
  const imageUrls = process.argv.slice(2);
  if (imageUrls.length === 0) {
    console.error('Please provide at least one image URL or base64 string');
    process.exit(1);
  }

  processAndInsertTranscript(imageUrls)
    .then(result => {
      console.log('Transcript processing completed successfully');
      console.log('Transcript ID:', result.transcript_id);
      console.log('Term IDs:', result.term_ids);
      process.exit(0);
    })
    .catch(error => {
      console.error('Error:', error);
      process.exit(1);
    });
}

module.exports = {
  processAndInsertTranscript
}; 