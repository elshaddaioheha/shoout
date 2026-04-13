/**
 * Masks an email address for display purposes
 * Example: "john.doe@example.com" -> "jo****@example.com"
 */
export function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  const visible = Math.min(2, name.length);
  const masked = `${name.slice(0, visible)}${'*'.repeat(Math.max(0, name.length - visible))}`;
  return `${masked}@${domain}`;
}
