import { useWallet } from '../../hooks'
import { Button } from '../ui/button'
import { ChainSelector } from '../chain/ChainSelector'
import { Copy, Check, RefreshCw, Menu, ChevronDown } from 'lucide-react'
import * as React from 'react'
import type { NavItem } from './Sidebar'
import { USDCLogo, ArbitrumLogo } from '../ui/chain-logos'

interface HeaderProps {
  currentPage?: NavItem
  onMenuToggle?: () => void
}

const pageTitles: Record<NavItem, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Overview of your wallet & subscriptions' },
  subscriptions: { title: 'Subscriptions', subtitle: 'Manage your recurring payments' },
  activity: { title: 'Activity', subtitle: 'Transaction history' },
  bridge: { title: 'Bridge Funds', subtitle: 'Move USDC across chains' },
  demo: { title: 'SDK Demo', subtitle: 'Try the developer API' },
  docs: { title: 'Documentation', subtitle: 'Integration guides & references' },
  settings: { title: 'Settings', subtitle: 'Wallet preferences' },
}

export function Header({ currentPage = 'dashboard', onMenuToggle }: HeaderProps) {
  const { account, balance, fetchBalance } = useWallet()
  const [copied, setCopied] = React.useState(false)
  const [isRefreshing, setIsRefreshing] = React.useState(false)

  const handleCopy = () => {
    if (account?.address) {
      navigator.clipboard.writeText(account.address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await fetchBalance()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const formatBalance = (bal: string | null) => {
    if (bal === null) return '0.00'
    const value = parseFloat(bal)
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  const page = pageTitles[currentPage]

  return (
    <header className="relative z-50 flex h-14 md:h-[60px] items-center justify-between border-b border-border/50 bg-background/80 backdrop-blur-md px-3 md:px-6 gap-3">
      {/* Left: hamburger + page title */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <button
          onClick={onMenuToggle}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 md:hidden flex-shrink-0 transition-colors"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>
        <div className="min-w-0">
          <h1 className="text-[14px] md:text-[15px] font-semibold tracking-tight leading-tight truncate" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            {page.title}
          </h1>
          <p className="hidden md:block text-[11px] text-muted-foreground/60 leading-tight truncate">{page.subtitle}</p>
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
        {/* Chain indicator — desktop only, replace chain selector visually */}
        <div className="hidden md:flex items-center gap-1.5 rounded-lg bg-muted/40 border border-border/50 px-2.5 py-1.5">
          <ArbitrumLogo size={14} />
          <span className="text-[11px] font-medium text-muted-foreground">Arbitrum Sepolia</span>
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        </div>

        {/* Balance pill with USDC logo */}
        <div className="flex items-center gap-1.5 sm:gap-2 rounded-xl border border-violet-200/50 bg-gradient-to-r from-violet-50 to-purple-50/80 px-2.5 sm:px-3.5 py-1.5 sm:py-2 shadow-sm">
          <USDCLogo size={16} className="flex-shrink-0" />
          <span className="text-[13px] sm:text-sm font-bold text-foreground tabular-nums">{formatBalance(balance)}</span>
          <span className="hidden sm:inline text-[11px] font-medium text-violet-500/70">USDC</span>
          <button
            onClick={handleRefresh}
            className="ml-0.5 text-violet-400 hover:text-violet-600 transition-colors"
            title="Refresh balance"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-border/60 mx-0.5" />

        {/* Wallet address chip — desktop */}
        <button
          onClick={handleCopy}
          className="hidden sm:flex items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground hover:border-border group"
        >
          {account?.address && formatAddress(account.address)}
          {copied ? (
            <Check className="h-3 w-3 text-emerald-500 flex-shrink-0" />
          ) : (
            <Copy className="h-3 w-3 flex-shrink-0 opacity-50 group-hover:opacity-100" />
          )}
        </button>

        {/* Mobile chain selector — keep functionality */}
        <div className="md:hidden">
          <ChainSelector />
        </div>
      </div>
    </header>
  )
}
