/** Short random id for nested records (contacts, interviews, timeline events). */
export function newId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
}
