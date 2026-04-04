import { cn } from '@/lib/utils'
import { MessageRole } from '@/types'

interface ChatBubbleProps {
  role:         MessageRole
  content:      string
  isStreaming?:  boolean
  isDocument?:  boolean
}

export function ChatBubble({ role, content, isStreaming, isDocument }: ChatBubbleProps) {
  const isUser = role === MessageRole.USER

  return (
    <div className={cn('flex mb-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs mr-2 mt-1 shrink-0">
          AI
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] min-w-0 rounded-2xl px-4 py-2.5 text-sm leading-relaxed break-words',
          isUser && !isDocument && 'bg-primary text-primary-foreground rounded-br-sm',
          isUser && isDocument  && 'bg-emerald-600 text-white rounded-br-sm',
          !isUser               && 'bg-muted text-foreground rounded-bl-sm',
        )}
      >
        {isDocument && isUser && (
          <span className="block text-emerald-100/80 text-xs mb-1">📎 Documento caricato</span>
        )}
        <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{content}</span>
        {isStreaming && (
          <span className="inline-block w-[2px] h-4 bg-current ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  )
}
