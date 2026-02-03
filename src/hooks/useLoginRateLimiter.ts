import { useState, useEffect, useCallback } from 'react';

interface RateLimitState {
  attempts: number;
  lockedUntil: number | null;
  lastAttemptEmail: string | null;
}

const STORAGE_KEY = 'login_rate_limit';
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function getStoredState(): RateLimitState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { attempts: 0, lockedUntil: null, lastAttemptEmail: null };
}

function saveState(state: RateLimitState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function useLoginRateLimiter() {
  const [state, setState] = useState<RateLimitState>(getStoredState);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  // Check if currently locked
  const isLocked = useCallback(() => {
    if (!state.lockedUntil) return false;
    return Date.now() < state.lockedUntil;
  }, [state.lockedUntil]);

  // Calculate remaining lockout time
  useEffect(() => {
    if (!state.lockedUntil) {
      setRemainingTime(0);
      return;
    }

    const updateRemaining = () => {
      const remaining = Math.max(0, state.lockedUntil! - Date.now());
      setRemainingTime(remaining);
      
      // Auto-unlock when time expires
      if (remaining === 0 && state.lockedUntil) {
        const newState = { attempts: 0, lockedUntil: null, lastAttemptEmail: null };
        setState(newState);
        saveState(newState);
      }
    };

    updateRemaining();
    const interval = setInterval(updateRemaining, 1000);
    return () => clearInterval(interval);
  }, [state.lockedUntil]);

  // Record a failed attempt
  const recordFailedAttempt = useCallback((email: string) => {
    const currentState = getStoredState();
    
    // Reset if different email or if lockout expired
    if (currentState.lastAttemptEmail !== email || 
        (currentState.lockedUntil && Date.now() >= currentState.lockedUntil)) {
      const newState: RateLimitState = {
        attempts: 1,
        lockedUntil: null,
        lastAttemptEmail: email,
      };
      setState(newState);
      saveState(newState);
      return { locked: false, attemptsRemaining: MAX_ATTEMPTS - 1 };
    }

    const newAttempts = currentState.attempts + 1;
    
    if (newAttempts >= MAX_ATTEMPTS) {
      const lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      const newState: RateLimitState = {
        attempts: newAttempts,
        lockedUntil,
        lastAttemptEmail: email,
      };
      setState(newState);
      saveState(newState);
      return { locked: true, attemptsRemaining: 0 };
    }

    const newState: RateLimitState = {
      attempts: newAttempts,
      lockedUntil: null,
      lastAttemptEmail: email,
    };
    setState(newState);
    saveState(newState);
    return { locked: false, attemptsRemaining: MAX_ATTEMPTS - newAttempts };
  }, []);

  // Record successful login
  const recordSuccess = useCallback(() => {
    clearState();
    setState({ attempts: 0, lockedUntil: null, lastAttemptEmail: null });
  }, []);

  // Format remaining time for display
  const formatRemainingTime = useCallback(() => {
    if (remainingTime <= 0) return '';
    const minutes = Math.floor(remainingTime / 60000);
    const seconds = Math.floor((remainingTime % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingTime]);

  return {
    isLocked: isLocked(),
    attemptsRemaining: MAX_ATTEMPTS - state.attempts,
    remainingTime,
    formatRemainingTime,
    recordFailedAttempt,
    recordSuccess,
  };
}
