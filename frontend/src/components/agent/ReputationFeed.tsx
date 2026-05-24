import * as React from 'react'
import { ShieldCheck, Star, ExternalLink } from 'lucide-react'
import { useAgentReputation } from '../../hooks/useAgentReputation'
import { ERC8004_ADDRESSES } from '../../config/erc8004'

function scoreColor(score: number) {
  if (score >= 80) return 'text-emerald-600 bg-emerald-50'
  if (score >= 50) return 'text-amber-600 bg-amber-50'
  return 'text-red-600 bg-red-50'
}

export function ReputationFeed() {
  const { events, isLoading } = useAgentReputation()

  if (isLoading && events.length === 0) {
    return (
      <div className="space-y-1.5">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-4 text-center">
        <Star className="h-5 w-5 text-muted-foreground/40 mb-1.5" />
        <p className="text-[11px] text-muted-foreground">No reputation events yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {events.slice(0, 5).map((ev, i) => (
        <div
          key={ev.txHash || i}
          className="flex items-center gap-2 rounded-lg border border-border/50 bg-white/60 px-2.5 py-2"
        >
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-foreground truncate">{ev.tag || 'feedback'}</p>
            <p className="text-[9px] text-muted-foreground truncate">
              {ev.validator.slice(0, 6)}…{ev.validator.slice(-4)}
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-semibold rounded-md px-1.5 py-0.5 ${scoreColor(ev.score)}`}>
              {ev.score}
            </span>
            {ev.txHash && (
              <a
                href={`https://testnet.arcscan.app/tx/${ev.txHash}`}
                target="_blank"
                rel="noreferrer"
                className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
