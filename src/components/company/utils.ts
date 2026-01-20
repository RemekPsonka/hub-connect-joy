/**
 * Safely converts values that might be objects from KRS API to strings
 * KRS API sometimes returns data as arrays of objects or nested objects
 */
export const safeString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value === null || value === undefined) return '';
  
  // Handle arrays - common in KRS API (e.g., nazwa: [{nazwa: "...", nrWpisuWprow: "1"}])
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    const first = value[0];
    if (typeof first === 'string') return first;
    if (first && typeof first === 'object') {
      return (first as any).nazwa || (first as any).wartość || (first as any).value || String(first);
    }
    return String(first);
  }
  
  // Handle objects - common in KRS API (e.g., formaPrawna: {nazwa: "...", wartość: "..."})
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('nazwa' in obj && typeof obj.nazwa === 'string') return obj.nazwa;
    if ('wartość' in obj && typeof obj.wartość === 'string') return obj.wartość;
    if ('value' in obj && typeof obj.value === 'string') return obj.value;
    // Try to stringify if nothing else works
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  
  return String(value);
};

/**
 * Safely converts value to array of strings
 */
export const safeArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map(item => safeString(item)).filter(Boolean);
  }
  if (typeof value === 'string' && value) {
    return [value];
  }
  return [];
};
