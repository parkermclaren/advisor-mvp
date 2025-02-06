function structureData(courseData, financeData, genEdData = {}) {
  const structured = {
    course_catalog: courseData, // array of course objects {courseCode, courseName, courseDesc}
    finance_degree: {
      requirements: financeData
    },
    gen_ed_courses: genEdData
  };
  return structured;
}

module.exports = { structureData }; 