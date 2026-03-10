import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function validateKeyName(name: string): boolean {
  if (!name) return false;
  // Allow letters, numbers, underscores, hyphens, and dots
  const nameRegex = /^[a-zA-Z0-9_.-]+$/;
  return nameRegex.test(name);
}

export function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
