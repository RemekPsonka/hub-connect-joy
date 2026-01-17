/**
 * Calculates the effective status of a cross-task based on its workflow progress.
 * 
 * Status logic:
 * - 'completed': intro_made is true
 * - 'in_progress': at least one person discussed but intro not made yet
 * - 'pending': nothing done yet
 */
export function calculateCrossTaskStatus(crossTask: {
  discussed_with_a: boolean | null;
  discussed_with_b: boolean | null;
  intro_made: boolean | null;
}): 'pending' | 'in_progress' | 'completed' {
  const discussedA = crossTask.discussed_with_a || false;
  const discussedB = crossTask.discussed_with_b || false;
  const introMade = crossTask.intro_made || false;

  // If intro is made, the task is completed
  if (introMade) return 'completed';
  
  // If at least one person has been discussed with, it's in progress
  if (discussedA || discussedB) return 'in_progress';
  
  // Nothing done yet
  return 'pending';
}
