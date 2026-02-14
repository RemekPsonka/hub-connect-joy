/**
 * Calculates the effective status of a cross-task based on its workflow progress.
 * 
 * Status logic:
 * - 'completed': intro_made is true
 * - 'in_progress': at least one person discussed but intro not made yet
 * - 'todo': nothing done yet
 */
export function calculateCrossTaskStatus(crossTask: {
  discussed_with_a: boolean | null;
  discussed_with_b: boolean | null;
  intro_made: boolean | null;
}): 'todo' | 'in_progress' | 'completed' {
  const discussedA = crossTask.discussed_with_a || false;
  const discussedB = crossTask.discussed_with_b || false;
  const introMade = crossTask.intro_made || false;

  // If intro is made, the task is completed
  if (introMade) return 'completed';
  
  // If at least one person has been discussed with, it's in progress
  if (discussedA || discussedB) return 'in_progress';
  
  // Nothing done yet
  return 'todo';
}

/**
 * Calculates the progress of a cross-task (0-3 steps completed)
 * 
 * Steps:
 * 1. Discussed with contact A
 * 2. Discussed with contact B
 * 3. Intro made
 */
export function calculateCrossTaskProgress(crossTask: {
  discussed_with_a: boolean | null;
  discussed_with_b: boolean | null;
  intro_made: boolean | null;
}): { completed: number; total: number } {
  const discussedA = crossTask.discussed_with_a || false;
  const discussedB = crossTask.discussed_with_b || false;
  const introMade = crossTask.intro_made || false;

  let completed = 0;
  if (discussedA) completed++;
  if (discussedB) completed++;
  if (introMade) completed++;

  return { completed, total: 3 };
}
