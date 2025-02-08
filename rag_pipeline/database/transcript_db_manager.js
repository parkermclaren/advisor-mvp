const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

class TranscriptDBManager {
    constructor() {
        this.supabase = createClient(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY);
    }

    async insertTranscriptSummary(transcriptData) {
        const { data, error } = await this.supabase
            .from('student_transcripts')
            .insert([transcriptData])
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async insertTermData(termData) {
        // Add a timestamp based on the term name for sorting
        const termYear = parseInt(termData.term_name.split(' ')[0]);
        const termPeriod = termData.term_name.split(' ')[1].toLowerCase();
        let termOrder = termYear * 10;
        
        // Add term period weight
        switch(termPeriod) {
            case 'spring': termOrder += 1; break;
            case 'summer': termOrder += 2; break;
            case 'fall': termOrder += 3; break;
        }

        const termWithOrder = {
            ...termData,
            term_order: termOrder
        };

        const { data, error } = await this.supabase
            .from('transcript_terms')
            .insert([termWithOrder])
            .select();

        if (error) throw error;
        return data;
    }

    async insertFullTranscript(transcriptSummary, terms) {
        try {
            // Insert the transcript summary first
            const summaryResult = await this.insertTranscriptSummary(transcriptSummary);
            const transcript_id = summaryResult.transcript_id;

            // Sort terms chronologically before inserting
            const sortedTerms = [...terms].sort((a, b) => {
                const aYear = parseInt(a.termName.split(' ')[0]);
                const bYear = parseInt(b.termName.split(' ')[0]);
                if (aYear !== bYear) return aYear - bYear;
                
                const termOrder = { 'Spring': 1, 'Summer': 2, 'Fall': 3 };
                const aTerm = a.termName.split(' ')[1];
                const bTerm = b.termName.split(' ')[1];
                return termOrder[aTerm] - termOrder[bTerm];
            });

            // Insert each term with the transcript_id
            const termPromises = sortedTerms.map(term => 
                this.insertTermData({
                    ...term,
                    transcript_id
                })
            );

            await Promise.all(termPromises);
            return { transcript_id, success: true };
        } catch (error) {
            console.error('Error inserting transcript:', error);
            throw error;
        }
    }
}

module.exports = new TranscriptDBManager(); 