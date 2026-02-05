import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
      const obj = first as Record<string, unknown>;
      return String(obj.nazwa ?? obj.wartość ?? obj.value ?? first);
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
 * Handles strings, arrays of strings, and arrays of objects
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

/**
 * Safely converts value to a number
 * Handles numbers, strings, and objects with amount/value keys
 */
export const safeNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'number') return isNaN(value) ? undefined : value;
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^\d.,-]/g, '').replace(',', '.');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? undefined : parsed;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if ('amount' in obj) return safeNumber(obj.amount);
    if ('value' in obj) return safeNumber(obj.value);
    if ('wartość' in obj) return safeNumber(obj.wartość);
  }
  return undefined;
};

/**
 * Safely parses awards/certifications that may be objects or strings
 */
export const safeAwardArray = (value: unknown): string[] => {
  if (!value) return [];
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) {
    return value.map(item => {
      if (typeof item === 'string') return item;
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>;
        return obj.award_name || obj.name || obj.title || obj.nazwa || safeString(item);
      }
      return String(item);
    }).filter(Boolean) as string[];
  }
  return [];
};

/**
 * Normalizes null/undefined to empty string for form comparisons
 */
export const normalizeNotes = (value: string | null | undefined): string => value || '';
