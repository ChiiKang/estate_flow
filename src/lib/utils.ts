import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'MYR') {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date))
}

export function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat('en-MY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatPhone(phone: string) {
  return phone.replace(/(\+\d{1,2})(\d{2,3})(\d{3,4})(\d{4})/, '$1 $2-$3 $4')
}

export function formatPSM(price: number, sizeSqm: number) {
  if (!sizeSqm || sizeSqm === 0) return "—"
  return formatCurrency(price / sizeSqm)
}

export function formatPSF(price: number, sizeSqm: number) {
  if (!sizeSqm || sizeSqm === 0) return "—"
  const sqft = sizeSqm * 10.764
  return formatCurrency(price / sqft)
}
