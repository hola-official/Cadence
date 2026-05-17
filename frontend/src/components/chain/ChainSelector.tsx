import { AvalancheLogo } from '../ui/chain-logos'

export function ChainSelector() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm">
      <AvalancheLogo size={16} />
      <span className="hidden sm:inline">Avalanche Fuji</span>
    </div>
  )
}
