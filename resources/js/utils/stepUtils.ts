export const parseCompletedSteps = (s?: string): number[] => {
  if (!s) return [];
  return s
    .split(',')
    .map((n) => parseInt(n.trim(), 10))
    .filter((n) => !isNaN(n) && n > 0);
};

export const toCompletedStepsCsv = (nums: number[]): string => {
  const uniqSorted = Array.from(new Set(nums.filter((n) => n > 0))).sort((a, b) => a - b);
  return uniqSorted.join(',');
};

export const getHighestCompleted = (s?: string): number => {
  const arr = parseCompletedSteps(s);
  if (arr.length === 0) return 0;
  return Math.max(...arr);
};

export const addCompletedStep = (s: string | undefined, stepId: number): string => {
  const arr = parseCompletedSteps(s);
  arr.push(stepId);
  return toCompletedStepsCsv(arr);
};

export const canNavigateToStep = ({
  targetStep,
  currentHighest,
}: {
  targetStep: number;
  currentHighest: number;
}): boolean => {
  if (targetStep <= 1) return true;
  return currentHighest >= targetStep - 1;
};


