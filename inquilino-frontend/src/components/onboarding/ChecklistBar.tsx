import type { ChecklistItemDto } from '@/types'

interface ChecklistBarProps {
  items: ChecklistItemDto[]
}

export function ChecklistBar({ items }: ChecklistBarProps) {
  if (!items.length) return null

  return (
    <div className="border-b bg-muted/20 px-4 py-2">
      {/* Horizontal scroll — no scrollbar visible on mobile */}
      <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {items.map(item => (
          <div
            key={item.key}
            className={`
              flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs shrink-0
              transition-colors duration-300
              ${item.collected
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : item.required
                  ? 'bg-background border border-border text-muted-foreground'
                  : 'bg-background border border-dashed border-border/60 text-muted-foreground/70'
              }
            `}
          >
            <span className="text-[10px]">{item.collected ? '✓' : '○'}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
