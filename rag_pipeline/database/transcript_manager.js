const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

const supabase = createClient(config.supabaseUrl, config.supabaseKey);

/**
 * Inserts transcript data into the database
 * @param {Object} transcriptData - The validated transcript data
 * @returns {Object} Object containing the inserted transcript and term IDs
 */
async function insertTranscriptData(transcriptData) {
  try {
    // Start a Supabase transaction
    const { data: transcriptRecord, error: transcriptError } = await supabase
      .from('student_transcripts')
      .insert({
        student_name: transcriptData.summary.student_name,
        program: transcriptData.summary.program,
        attempted_credits_transfer: transcriptData.summary.attempted_credits_transfer,
        attempted_credits_residential: transcriptData.summary.attempted_credits_residential,
        attempted_credits_cumulative: transcriptData.summary.attempted_credits_cumulative,
        earned_credits_transfer: transcriptData.summary.earned_credits_transfer,
        earned_credits_residential: transcriptData.summary.earned_credits_residential,
        earned_credits_cumulative: transcriptData.summary.earned_credits_cumulative,
        cumulative_gpa: transcriptData.summary.cumulative_gpa
      })
      .select()
      .single();

    if (transcriptError) {
      throw new Error(`Error inserting transcript: ${transcriptError.message}`);
    }

    console.log('Successfully inserted transcript summary');

    // Insert each term with the transcript_id
    const termPromises = transcriptData.terms.map(async (term) => {
      const { data: termRecord, error: termError } = await supabase
        .from('transcript_terms')
        .insert({
          transcript_id: transcriptRecord.transcript_id,
          term_name: term.term_name,
          term_attempted_credits: term.term_attempted_credits,
          term_earned_credits: term.term_earned_credits,
          term_gpa: term.term_gpa,
          courses: term.courses
        })
        .select()
        .single();

      if (termError) {
        throw new Error(`Error inserting term: ${termError.message}`);
      }

      return termRecord;
    });

    const termRecords = await Promise.all(termPromises);
    console.log(`Successfully inserted ${termRecords.length} terms`);

    return {
      transcript_id: transcriptRecord.transcript_id,
      term_ids: termRecords.map(term => term.term_id)
    };
  } catch (error) {
    console.error('Error in insertTranscriptData:', error);
    throw error;
  }
}

/**
 * Retrieves a student's complete transcript data
 * @param {string} transcriptId - The transcript ID to retrieve
 * @returns {Object} Complete transcript data including all terms
 */
async function getTranscriptData(transcriptId) {
  try {
    // Get transcript summary
    const { data: transcript, error: transcriptError } = await supabase
      .from('student_transcripts')
      .select('*')
      .eq('transcript_id', transcriptId)
      .single();

    if (transcriptError) {
      throw new Error(`Error retrieving transcript: ${transcriptError.message}`);
    }

    // Get all terms for this transcript
    const { data: terms, error: termsError } = await supabase
      .from('transcript_terms')
      .select('*')
      .eq('transcript_id', transcriptId)
      .order('term_name');

    if (termsError) {
      throw new Error(`Error retrieving terms: ${termsError.message}`);
    }

    return {
      summary: transcript,
      terms: terms
    };
  } catch (error) {
    console.error('Error in getTranscriptData:', error);
    throw error;
  }
}

module.exports = {
  insertTranscriptData,
  getTranscriptData
}; 