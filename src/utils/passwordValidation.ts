import { z } from 'zod';

// Strong password requirements
export const strongPasswordSchema = z.string()
  .min(12, 'Hasło musi mieć co najmniej 12 znaków')
  .regex(/[A-Z]/, 'Hasło musi zawierać co najmniej jedną wielką literę')
  .regex(/[a-z]/, 'Hasło musi zawierać co najmniej jedną małą literę')
  .regex(/[0-9]/, 'Hasło musi zawierać co najmniej jedną cyfrę')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Hasło musi zawierać co najmniej jeden znak specjalny (!@#$%^&*)');

// Password requirements for UI display
export const PASSWORD_REQUIREMENTS = [
  { id: 'length', label: 'Co najmniej 12 znaków', regex: /.{12,}/ },
  { id: 'uppercase', label: 'Co najmniej jedna wielka litera', regex: /[A-Z]/ },
  { id: 'lowercase', label: 'Co najmniej jedna mała litera', regex: /[a-z]/ },
  { id: 'number', label: 'Co najmniej jedna cyfra', regex: /[0-9]/ },
  { id: 'special', label: 'Co najmniej jeden znak specjalny (!@#$%^&*)', regex: /[!@#$%^&*(),.?":{}|<>]/ },
];

export function checkPasswordRequirements(password: string) {
  return PASSWORD_REQUIREMENTS.map((req) => ({
    ...req,
    met: req.regex.test(password),
  }));
}

export function isPasswordStrong(password: string): boolean {
  return PASSWORD_REQUIREMENTS.every((req) => req.regex.test(password));
}
