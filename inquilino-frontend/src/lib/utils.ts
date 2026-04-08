import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Riscrive gli URL di MinIO per passare attraverso il proxy Vite (/minio/...).
 * Evita il Mixed Content: il browser riceve sempre HTTPS da Vite,
 * che internamente fa da proxy verso http://localhost:9000.
 */
export function resolveMediaUrl(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    // Qualunque URL che punta alla porta 9000 (MinIO) → proxy Vite
    if (parsed.port === '9000') {
      return '/minio' + parsed.pathname + parsed.search
    }
    return url
  } catch {
    return url
  }
}
