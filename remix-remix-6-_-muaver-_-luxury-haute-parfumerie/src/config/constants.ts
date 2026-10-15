/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Unified Admin Setup Configuration
 * - Permanent Owner: Full executive owner access, permanent badge, demote/remove disabled
 * - Technical Support Accounts: Maintained by Zevnora Agency with support & owner permissions
 */
export const ADMIN_SETUP = {
  permanentOwner: {
    email: 'hellomuaver@gmail.com',
    displayName: 'MUAVER | Luxury Brand',
    role: 'owner' as const,
  },
  technicalSupport: [
    {
      email: 'zevnora.agency@gmail.com',
      displayName: 'Zevnora',
      role: 'owner' as const,
    },
    {
      email: 'ai.alizaib@gmail.com',
      displayName: 'Ali Zaib',
      role: 'owner' as const,
    },
  ],
} as const;

export const PERMANENT_OWNER_EMAIL = ADMIN_SETUP.permanentOwner.email.toLowerCase();

export const TECHNICAL_SUPPORT_EMAILS: readonly string[] = ADMIN_SETUP.technicalSupport.map(
  (a) => a.email.toLowerCase()
);

/**
 * All privileged system admin emails (Permanent Owner + Technical Support)
 */
export const PERMANENT_ADMIN_EMAILS: readonly string[] = [
  PERMANENT_OWNER_EMAIL,
  ...TECHNICAL_SUPPORT_EMAILS,
] as const;

/**
 * Check whether an email matches the permanent owner account (case-insensitive)
 */
export function isPermanentOwnerEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return email.trim().toLowerCase() === PERMANENT_OWNER_EMAIL;
}

/**
 * Check whether an email matches any of the technical support accounts (case-insensitive)
 */
export function isTechnicalSupportEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return TECHNICAL_SUPPORT_EMAILS.includes(normalized);
}

/**
 * Check whether an email matches any of the permanent system accounts (case-insensitive)
 */
export function isPermanentAdminEmail(email?: string | null): boolean {
  return isPermanentOwnerEmail(email) || isTechnicalSupportEmail(email);
}

/**
 * Canonical Site URL for sharing, WhatsApp messages, and canonical meta
 */
export const SITE_URL = 'https://muaver.vercel.app';

/**
 * Clean URL slug generator
 * Converts string to lowercase, replaces non-alphanumeric chars with hyphens, trims dashes
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
