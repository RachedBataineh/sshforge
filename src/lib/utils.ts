import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatFingerprint(fingerprint: string): string {
  // Format SHA256 fingerprint for display
  return fingerprint.replace(/^SHA256:/, '');
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

export function validateKeyName(name: string): boolean {
  // Valid key names: alphanumeric, dashes, underscores, dots
  return /^[a-zA-Z0-9_.-]+$/.test(name);
}

export function validateEmail(email: string): boolean {
  if (!email) return true; // Email is optional
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function generateDefaultKeyName(algorithm: string): string {
  const prefix = algorithm === 'rsa-4096' ? 'id_rsa' :
                 algorithm === 'ecdsa' ? 'id_ecdsa' :
                 'id_ed25519';
  return prefix;
}
