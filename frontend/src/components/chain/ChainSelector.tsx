import { ArcLogo } from '../ui/chain-logos'

export function ChainSelector() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm">
      <ArcLogo size={16} />
      <span className="hidden sm:inline">Arc Testnet</span>
      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
    </div>
  )
}
