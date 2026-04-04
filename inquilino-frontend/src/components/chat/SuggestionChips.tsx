import type { Suggestion } from '@/types'

interface SuggestionChipsProps {
  suggestions: Suggestion[]
  onSelect:    (value: string) => void
  disabled?:   boolean
}

export function SuggestionChips({ suggestions, onSelect, disabled }: SuggestionChipsProps) {
  if (!suggestions.length) return null

  return (
    <div className="px-4 py-2 flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
      {suggestions.map(s => (
        <button
          key={s.value}
          onClick={() => onSelect(s.label)}   // send the human-readable label, not the value
          disabled={disabled}
          className="
            whitespace-nowrap rounded-full border border-primary/40 bg-primary/5
            px-3 py-1.5 text-sm text-primary hover:bg-primary/10
            transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0
          "
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}
