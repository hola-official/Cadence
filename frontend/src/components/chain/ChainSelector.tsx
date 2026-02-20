export function ChainSelector() {
  return (
    <div className="flex items-center gap-1.5 rounded-lg border border-border/50 bg-white px-2.5 py-1.5 text-xs font-medium text-foreground shadow-sm">
      <img src="/arb-logo.png" alt="Arbitrum" className="h-4 w-4 rounded-full" />
      <span className="hidden sm:inline">Arbitrum Sepolia</span>
    </div>
  )
}
