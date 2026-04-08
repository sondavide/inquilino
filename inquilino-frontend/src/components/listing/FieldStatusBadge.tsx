import type { ListingFieldValidation } from '../../types'

export function getVS(vs: ListingFieldValidation[] | undefined, field: string) {
  return vs?.find(v => v.fieldName === field)
}

/**
 * Restituisce la classe CSS aggiuntiva per il bordo dell'input in base allo stato.
 * Usare insieme alla classe base dell'input.
 */
export function fieldBorderClass(vs: ListingFieldValidation[] | undefined, field: string): string {
  const v = getVS(vs, field)
  if (!v) return ''
  if (v.status === 'APPROVED') return '!border-green-400 !ring-green-200'
  if (v.status === 'FLAGGED')  return '!border-red-400 !ring-red-200'
  return '!border-orange-300 !ring-orange-100'
}

/**
 * Pallino colorato da mostrare accanto all'etichetta del campo.
 * Arancione = da validare, Verde = approvato, Rosso = segnalato.
 */
export function FieldStatusBadge({ vs, field }: {
  vs: ListingFieldValidation[] | undefined
  field: string
}) {
  const v = getVS(vs, field)
  if (!v) return null
  if (v.status === 'APPROVED') return (
    <span className="ml-1.5 text-xs text-green-600 font-semibold">✓</span>
  )
  if (v.status === 'FLAGGED') return (
    <span className="ml-1.5 text-xs text-red-600 font-semibold">✗</span>
  )
  // PENDING
  return <span className="ml-1.5 inline-block w-2 h-2 rounded-full bg-orange-400 align-middle" />
}

/**
 * Nota del supervisore per i campi FLAGGED. Mostrare sotto all'input.
 */
export function FieldNote({ vs, field }: {
  vs: ListingFieldValidation[] | undefined
  field: string
}) {
  const v = getVS(vs, field)
  if (!v?.note || v.status !== 'FLAGGED') return null
  return <p className="text-xs text-red-600 mt-1">⚠ {v.note}</p>
}
