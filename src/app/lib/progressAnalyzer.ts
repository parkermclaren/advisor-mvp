import { ProgressData, Requirement } from './types';

interface IncompleteRequirements {
  financeCoreRemaining: string[];
  financeElectivesNeeded: number;
  genEdCategoriesMissing: string[];
}

export function findIncompleteRequirements(progressData: ProgressData): IncompleteRequirements {
  const result: IncompleteRequirements = {
    financeCoreRemaining: [],
    financeElectivesNeeded: 0,
    genEdCategoriesMissing: []
  };

  // Helper function to check if a requirement needs more credits
  const needsMoreCredits = (req: Requirement) => {
    return req.student_status.status === 'in_progress' && 
           (req.student_status.credits_completed || 0) < req.credits_required;
  };

  progressData.requirements.forEach(req => {
    // Check Finance Core requirements (BUS prefix and not elective)
    if (req.id.startsWith('BUS') && req.type === 'finance_core' && 
        (req.student_status.status === 'not_started' || needsMoreCredits(req))) {
      result.financeCoreRemaining.push(req.id);
    }

    // Check Finance Electives (either explicit FINANCE_ELECTIVES or BUS with finance_elective type)
    if (req.id === 'FINANCE_ELECTIVES' || req.type === 'finance_elective') {
      if (req.student_status.status === 'not_started') {
        result.financeElectivesNeeded = req.credits_required || 0;
      } else if (needsMoreCredits(req)) {
        result.financeElectivesNeeded = (req.credits_required || 0) - (req.student_status.credits_completed || 0);
      }
    }

    // Check Gen Ed Categories (either explicit GENED_ prefix or gen_ed type)
    if ((req.id.startsWith('GENED_') || req.type === 'gen_ed') && 
        (req.student_status.status === 'not_started' || needsMoreCredits(req))) {
      // Extract category from either the ID or the category field
      const category = req.title || req.id.replace('GENED_', '').toLowerCase().replace(/_/g, ' ');
      if (category) {
        result.genEdCategoriesMissing.push(category);
      }
    }
  });

  return result;
} 