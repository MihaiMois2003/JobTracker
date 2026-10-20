import { currentLanguage } from '../i18n'

export const CURRENCIES = ['RON', 'EUR', 'USD', 'GBP', 'CHF'] as const

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(currentLanguage() === 'ro' ? 'ro-RO' : 'en-GB', { maximumFractionDigits: 0 }).format(value)
}

/** "8.000–12.000 RON" / "from 8,000 EUR" / "" */
export function formatSalaryRange(min: number | null, max: number | null, currency: string): string {
  if (min === null && max === null) return ''
  if (min !== null && max !== null && min !== max) return `${formatNumber(min)}–${formatNumber(max)} ${currency}`
  return `${formatNumber((min ?? max) as number)} ${currency}`
}
