function cleanText(text) {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

function createFinanceChunks(financeData) {
  const chunks = [];

  if (!financeData || !financeData.requirements) {
    console.error('Invalid finance data structure:', financeData);
    return chunks;
  }

  const content = financeData.requirements.content;
  if (!content) {
    console.error('No content found in finance data');
    return chunks;
  }

  // 1. Full Program Overview
  chunks.push({
    title: "Finance Major - Full Program Overview",
    content: cleanText(content),
    metadata: {
      type: "finance_degree",
      subtype: "full_overview",
      total_credits: "125-126",
      required_courses: financeData.requirements?.requirements?.required_courses || [],
      elective_courses: financeData.requirements?.requirements?.electives || []
    }
  });

  // 2. Year-specific chunks
  const yearSections = {
    'First Year': content.match(/First Year.*?(?=Sophomore|$)/s),
    'Sophomore Year': content.match(/Sophomore.*?(?=Junior Year|$)/s),
    'Junior Year': content.match(/Junior Year.*?(?=Senior Year|$)/s),
    'Senior Year': content.match(/Senior Year.*?(?=Learning Outcomes|$)/s)
  };

  Object.entries(yearSections).forEach(([yearName, match], index) => {
    if (match) {
      // Individual year chunk
      chunks.push({
        title: `Finance Major - ${yearName} Requirements`,
        content: cleanText(match[0]),
        metadata: {
          type: "finance_degree",
          subtype: "year_requirements",
          year: index + 1,
          year_name: yearName,
          total_credits: match[0].match(/Credits:\s*(\d+(?:-\d+)?)/)?.[1] || null
        }
      });
    }
  });

  // 3. Electives chunk
  const electivesMatch = content.match(/Healthcare Management Electives.*?(?=Learning Outcomes|$)/s);
  if (electivesMatch) {
    chunks.push({
      title: "Finance Major - Healthcare Management Electives",
      content: cleanText(electivesMatch[0]),
      metadata: {
        type: "finance_degree",
        subtype: "electives",
        elective_count: financeData.requirements?.requirements?.electives?.length || 0,
        electives: financeData.requirements?.requirements?.electives || []
      }
    });
  }

  // 4. Learning Outcomes chunk
  const outcomesMatch = content.match(/Learning Outcomes.*$/s);
  if (outcomesMatch) {
    chunks.push({
      title: "Finance Major - Learning Outcomes",
      content: cleanText(outcomesMatch[0]),
      metadata: {
        type: "finance_degree",
        subtype: "learning_outcomes"
      }
    });
  }

  // 5. General Education Requirements chunk
  const genEdMatches = Array.from(content.matchAll(/(?:[A-Za-z\s]+) General Education Requirement.*?(?=\n[A-Z]|$)/g));
  if (genEdMatches.length > 0) {
    const genEdContent = genEdMatches.map(match => match[0]).join('\n');
    chunks.push({
      title: "Finance Major - General Education Requirements",
      content: cleanText(genEdContent),
      metadata: {
        type: "finance_degree",
        subtype: "gen_ed_requirements",
        requirement_count: genEdMatches.length
      }
    });
  }

  return chunks;
}

function chunkStructuredData(structuredData) {
  const chunks = [];

  // Handle finance degree data
  if (structuredData.finance_degree) {
    const financeChunks = createFinanceChunks(structuredData.finance_degree);
    chunks.push(...financeChunks);
  }

  // Handle course catalog data
  if (structuredData.course_catalog) {
    structuredData.course_catalog.forEach((course) => {
      if (!course.courseDesc) {
        console.log(`Warning: No description for course ${course.courseCode}`);
        return;
      }

      chunks.push({
        title: `${course.courseCode} - ${course.courseName}`,
        content: cleanText(course.courseDesc),
        metadata: { 
          type: 'course_catalog', 
          courseCode: course.courseCode,
          credits: course.credits
        }
      });
    });
  }

  // Handle gen ed courses
  if (structuredData.gen_ed_courses) {
    Object.keys(structuredData.gen_ed_courses).forEach((category) => {
      structuredData.gen_ed_courses[category].forEach((course) => {
        const description = course.description || course.courseDesc || '';
        if (!description) {
          console.log(`Warning: No description for gen ed course ${course.courseCode}`);
          return;
        }

        chunks.push({
          title: `${course.courseCode} - ${course.courseName} [${category}]`,
          content: cleanText(description),
          metadata: { 
            type: 'gen_ed', 
            category: category,
            courseCode: course.courseCode,
            credits: course.credits
          }
        });
      });
    });
  }

  return chunks;
}

module.exports = { chunkStructuredData }; 