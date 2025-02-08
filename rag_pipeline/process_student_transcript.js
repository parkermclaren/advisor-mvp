const transcriptProcessor = require('./processors/transcript_processor');
const transcriptDB = require('./database/transcript_db_manager');

async function processAndInsertTranscript(summaryData, termsData) {
    try {
        // Process the transcript data
        const { transcriptSummary, terms } = transcriptProcessor.processFullTranscript(summaryData, termsData);

        // Insert into database
        const result = await transcriptDB.insertFullTranscript(transcriptSummary, terms);

        console.log('Successfully processed and inserted transcript:', result);
        return result;
    } catch (error) {
        console.error('Error processing transcript:', error);
        throw error;
    }
}

// Example usage:
/*
const sampleSummaryData = {
    studentName: "John Doe",
    program: "Computer Science",
    attemptedCreditsTransfer: 0,
    attemptedCreditsResidential: 60,
    attemptedCreditsCumulative: 60,
    earnedCreditsTransfer: 0,
    earnedCreditsResidential: 58,
    earnedCreditsCumulative: 58,
    cumulativeGPA: 3.8
};

const sampleTermsData = [
    {
        termName: "Fall 2023",
        termAttemptedCredits: 15,
        termEarnedCredits: 15,
        termGPA: 3.9,
        courses: [
            {
                courseCode: "CS101",
                courseTitle: "Introduction to Programming",
                grade: "A",
                attemptedCredits: 3,
                earnedCredits: 3,
                qualityPoints: 12
            },
            // ... more courses
        ]
    }
    // ... more terms
];

processAndInsertTranscript(sampleSummaryData, sampleTermsData)
    .then(result => console.log('Success:', result))
    .catch(error => console.error('Error:', error));
*/

module.exports = {
    processAndInsertTranscript
}; 