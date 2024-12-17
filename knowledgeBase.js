const faqData = require('./data/faqData.json');

function findRelevantContext(userQuery) {
  const query = userQuery.toLowerCase();
  let relevantContexts = [];
  const scoreThreshold = 0.3; // Adjust this threshold as needed

  for (const entry of faqData.faqs) {
    let score = 0;
    let maxScore = 0;

    // Check keyword matches
    entry.keywords.forEach(keyword => {
      if (query.includes(keyword.toLowerCase())) {
        score += 1;
      }
    });

    // Check question similarity
    entry.questions.forEach(question => {
      const questionWords = question.toLowerCase().split(' ');
      const queryWords = query.split(' ');
      const matchingWords = questionWords.filter(word => 
        queryWords.includes(word) && word.length > 3 // Only count significant words
      ).length;
      const similarity = matchingWords / Math.max(questionWords.length, queryWords.length);
      maxScore = Math.max(maxScore, similarity);
    });

    // Combine keyword and question similarity scores
    const finalScore = (score / entry.keywords.length + maxScore) / 2;

    if (finalScore > scoreThreshold) {
      relevantContexts.push({
        ...entry,
        relevanceScore: finalScore
      });
    }
  }

  // Sort by relevance and return top matches
  return relevantContexts
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 3); // Return top 3 most relevant contexts
}

module.exports = { findRelevantContext };