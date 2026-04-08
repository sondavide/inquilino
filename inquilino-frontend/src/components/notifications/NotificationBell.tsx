import { useEffect, useRef, useState } from 'react'
import { notificationsApi } from '@/api/notifications'
import type { AppNotification } from '@/types'

const POLL_INTERVAL_MS = 30_000

export function NotificationBell() {
  const [count, setCount]   = useState(0)
  const [open, setOpen]     = useState(false)
  const [items, setItems]   = useState<AppNotification[]>([])
  const [loading, setLoading] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Polling del contatore non letti
  useEffect(() => {
    const poll = () =>
      notificationsApi.getUnreadCount()
        .then(r => setCount(r.count))
        .catch(() => {})

    poll()
    const id = setInterval(poll, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  // Chiudi al click fuori
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleOpen = async () => {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    try {
      const all = await notificationsApi.getAll()
      setItems(all)
      setCount(0)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      setItems(prev => prev.map(n => ({ ...n, read: true })))
    } catch { /* ignore */ }
  }

  const handleMarkOne = async (id: string) => {
    try {
      await notificationsApi.markRead(id)
      setItems(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    } catch { /* ignore */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-muted/50 transition-colors"
        aria-label="Notifiche"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-[10px] font-bold text-white flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-card shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <span className="text-sm font-semibold">Notifiche</span>
            {items.some(n => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-primary hover:underline"
              >
                Segna tutte come lette
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <p className="text-sm text-muted-foreground text-center py-6">Caricamento…</p>
            )}
            {!loading && items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Nessuna notifica</p>
            )}
            {!loading && items.map(n => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkOne(n.id)}
                className={`px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-muted/30 transition-colors
                  ${!n.read ? 'bg-primary/5' : ''}`}
              >
                <div className="flex items-start gap-2">
                  {!n.read && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                  )}
                  <div className={!n.read ? '' : 'pl-4'}>
                    <p className="text-xs font-semibold text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
