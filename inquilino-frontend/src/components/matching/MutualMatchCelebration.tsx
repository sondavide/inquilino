import { useEffect, useState } from 'react'

// Particelle confetti con posizioni/dimensioni/ritardi random ma seed fisso
const PARTICLES = [
  { x: 12,  y: 15, size: 18, delay: 0,    dur: 1.2, emoji: '💚' },
  { x: 85,  y: 10, size: 22, delay: 0.1,  dur: 1.4, emoji: '🎉' },
  { x: 25,  y: 78, size: 16, delay: 0.2,  dur: 1.1, emoji: '✨' },
  { x: 70,  y: 80, size: 20, delay: 0.15, dur: 1.3, emoji: '💚' },
  { x: 50,  y: 5,  size: 24, delay: 0.05, dur: 1.5, emoji: '🎊' },
  { x: 5,   y: 45, size: 14, delay: 0.3,  dur: 1.0, emoji: '✨' },
  { x: 92,  y: 55, size: 18, delay: 0.25, dur: 1.2, emoji: '💚' },
  { x: 38,  y: 90, size: 16, delay: 0.1,  dur: 1.4, emoji: '🎉' },
  { x: 62,  y: 8,  size: 20, delay: 0.2,  dur: 1.1, emoji: '✨' },
  { x: 18,  y: 60, size: 14, delay: 0.35, dur: 1.3, emoji: '💚' },
]

export default function MutualMatchCelebration({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400)
    const t2 = setTimeout(() => setPhase('out'),  2800)
    const t3 = setTimeout(() => onDone(),          3400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const overlayOpacity = phase === 'out' ? 0 : 1
  const cardScale      = phase === 'in'  ? 0.6 : phase === 'out' ? 0.8 : 1
  const cardOpacity    = phase === 'out' ? 0 : 1

  return (
    <div
      onClick={onDone}
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        opacity: overlayOpacity,
        transition: 'opacity 0.5s ease',
      }}
    >
      {/* Particelle */}
      {PARTICLES.map((p, i) => (
        <div
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            left:      `${p.x}%`,
            top:       `${p.y}%`,
            fontSize:  p.size,
            opacity:   phase === 'in' ? 0 : phase === 'out' ? 0 : 1,
            transform: phase === 'hold' ? 'translateY(0)' : 'translateY(-20px)',
            transition: `opacity ${p.dur}s ease ${p.delay}s, transform ${p.dur}s ease ${p.delay}s`,
          }}
        >
          {p.emoji}
        </div>
      ))}

      {/* Card centrale */}
      <div
        className="bg-white rounded-3xl shadow-2xl px-10 py-10 flex flex-col items-center gap-4 max-w-xs mx-4"
        style={{
          transform:  `scale(${cardScale})`,
          opacity:    cardOpacity,
          transition: 'transform 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease',
        }}
      >
        {/* Cuore pulsante */}
        <div
          style={{
            fontSize: 72,
            animation: phase === 'hold' ? 'mutualPulse 0.8s ease infinite alternate' : 'none',
          }}
        >
          💚
        </div>

        <div className="text-center space-y-1">
          <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
            È un Match!
          </p>
          <p className="text-sm text-gray-500 leading-snug">
            Interesse reciproco confermato.<br />Trovi il profilo nella sezione Reciproci.
          </p>
        </div>

        <span className="text-xs text-gray-300 mt-1">Tocca per continuare</span>
      </div>

      <style>{`
        @keyframes mutualPulse {
          from { transform: scale(1);    }
          to   { transform: scale(1.12); }
        }
      `}</style>
    </div>
  )
}
