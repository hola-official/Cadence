import { useMemo } from 'react'
import { formatUSDC } from '../../types/subscriptions'
import { usePolicies, useWallet, useChain, useMetadataBatch } from '../../hooks'
import { TrendingDown, Calendar, CreditCard, Copy, Check, Send, ArrowUpRight } from 'lucide-react'
import { USDCLogo, ArbitrumLogo } from '../ui/chain-logos'

interface StatsOverviewProps {
  address?: string
  copied?: boolean
  onCopy?: () => void
  onSend?: () => void
}

/* ── Mobile: hero balance card ── */
function MobileHeroStats({
  balance,
  address,
  copied,
  onCopy,
  onSend,
  activePoliciesCount,
  monthlySpend,
  nextChargeTime,
}: {
  balance: string | null
  address?: string
  copied: boolean
  onCopy: () => void
  onSend: () => void
  activePoliciesCount: number
  monthlySpend: bigint
  nextChargeTime: string
}) {
  const { chainConfig } = useChain()
  const formatAddr = (a: string) => `${a.slice(0, 6)}...${a.slice(-4)}`
  const formatBal = (bal: string | null) => {
    if (bal === null) return '0.00'
    const v = parseFloat(bal)
    return v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  return (
    <div className="mobile-hero-stats md:hidden flex-shrink-0">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a0a2e] via-[#16072a] to-[#0d0520] px-5 py-5 shadow-xl shadow-violet-950/40">
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-violet-600/15 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-36 h-36 bg-purple-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4 pointer-events-none" />
        {/* Grid texture */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />

        <div className="relative">
          {/* Top row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <USDCLogo size={16} />
              <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">USDC Balance</span>
            </div>
            <div className="flex items-center gap-1.5">
              {address && (
                <button
                  onClick={onCopy}
                  className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] border border-white/[0.08] px-2.5 py-1.5 transition-all active:scale-95"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-400" />
                  ) : (
                    <>
                      <span className="font-mono text-[10px] text-white/40">{formatAddr(address)}</span>
                      <Copy className="h-2.5 w-2.5 text-white/30" />
                    </>
                  )}
                </button>
              )}
              <button
                onClick={onSend}
                className="flex items-center gap-1.5 rounded-lg bg-violet-500/20 border border-violet-500/30 px-2.5 py-1.5 transition-all active:scale-95 hover:bg-violet-500/30"
              >
                <Send className="h-3 w-3 text-violet-400" />
                <span className="text-[10px] font-semibold text-violet-300">Send</span>
              </button>
            </div>
          </div>

          {/* Balance */}
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[36px] font-bold text-white tracking-tight leading-none tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              {formatBal(balance)}
            </span>
            <span className="text-[14px] font-semibold text-white/30 mb-1">USDC</span>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            <ArbitrumLogo size={12} />
            <span className="text-[11px] text-white/30 font-medium">{chainConfig.shortName}</span>
          </div>

          {/* Stats row */}
          <div className="flex items-stretch gap-0 rounded-xl bg-white/[0.05] border border-white/[0.06] overflow-hidden">
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5">
              <span className="text-[14px] font-bold text-rose-400 tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {(Number(monthlySpend) / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] font-semibold text-white/25 uppercase tracking-widest">Monthly</span>
            </div>
            <div className="w-px bg-white/[0.06]" />
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5">
              <span className="text-[14px] font-bold text-emerald-400 tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>{activePoliciesCount}</span>
              <span className="text-[9px] font-semibold text-white/25 uppercase tracking-widest">Active</span>
            </div>
            <div className="w-px bg-white/[0.06]" />
            <div className="flex-1 flex flex-col items-center justify-center py-3 gap-0.5">
              <span className="text-[14px] font-bold text-amber-400 tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>{nextChargeTime}</span>
              <span className="text-[9px] font-semibold text-white/25 uppercase tracking-widest">Next</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function StatsOverview({ address, copied = false, onCopy, onSend }: StatsOverviewProps = {}) {
  const { balance } = useWallet()
  const { policies } = usePolicies()
  const { chainConfig } = useChain()

  const metadataUrls = useMemo(() => policies.map(p => p.metadataUrl || null), [policies])
  const metadataMap = useMetadataBatch(metadataUrls)

  const formatBalance = (bal: string | null) => {
    if (bal === null) return '0.00'
    const value = parseFloat(bal)
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatBalanceShort = (bal: string | null) => {
    if (bal === null) return '0.00'
    const value = parseFloat(bal)
    return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const activePolicies = policies.filter(p => p.active)
  const activePoliciesCount = activePolicies.length

  const monthlySpend = activePolicies.reduce((sum, p) => {
    const monthlyMultiplier = (30 * 24 * 60 * 60) / p.interval
    return sum + BigInt(Math.floor(Number(p.chargeAmount) * monthlyMultiplier))
  }, 0n)

  const now = Math.floor(Date.now() / 1000)
  const nextPolicy = activePolicies
    .map(p => {
      const raw = p.lastCharged + p.interval
      let nextCharge = raw
      if (nextCharge <= now) {
        const elapsed = now - p.lastCharged
        const periods = Math.ceil(elapsed / p.interval)
        nextCharge = p.lastCharged + periods * p.interval
      }
      return { policy: p, nextCharge }
    })
    .sort((a, b) => a.nextCharge - b.nextCharge)[0]

  const getNextChargeTime = (): string => {
    if (!nextPolicy) return '—'
    const diff = nextPolicy.nextCharge - now
    const days = Math.floor(diff / 86400)
    const hours = Math.floor((diff % 86400) / 3600)
    const mins = Math.floor((diff % 3600) / 60)
    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    if (mins > 0) return `~${mins}m`
    return '<1m'
  }

  const nextChargeTime = getNextChargeTime()
  const nextPolicyMetadata = nextPolicy?.policy.metadataUrl
    ? metadataMap.get(nextPolicy.policy.metadataUrl)
    : null
  const nextMerchant = nextPolicy
    ? (nextPolicyMetadata?.merchant?.name || `${nextPolicy.policy.merchant.slice(0, 6)}...`)
    : 'No active subs'

  const balanceValue = parseFloat(balance ?? '0')

  return (
    <>
      {/* ── Mobile hero ── */}
      <MobileHeroStats
        balance={balance}
        address={address}
        copied={copied}
        onCopy={onCopy || (() => {})}
        onSend={onSend || (() => {})}
        activePoliciesCount={activePoliciesCount}
        monthlySpend={monthlySpend}
        nextChargeTime={nextChargeTime}
      />

      {/* ── Desktop: featured balance + 3 stat pills ── */}
      <div className="hidden md:grid gap-4 grid-cols-3 lg:grid-cols-4 flex-shrink-0">

        {/* Featured balance card — spans 2 cols on lg */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e0a36] via-[#18072f] to-[#100420] p-5 shadow-lg shadow-violet-950/30 group">
          {/* Orbs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-violet-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none" />
          <div className="absolute bottom-0 left-4 w-24 h-24 bg-purple-400/10 rounded-full blur-2xl translate-y-1/2 pointer-events-none" />
          {/* Texture */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }} />

          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <USDCLogo size={18} />
                <span className="text-[11px] font-semibold text-white/40 uppercase tracking-widest">USDC Balance</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-md bg-white/[0.06] border border-white/[0.08] px-2 py-1">
                <ArbitrumLogo size={12} />
                <span className="text-[10px] font-medium text-white/35">{chainConfig.shortName}</span>
              </div>
            </div>

            <div className="flex items-baseline gap-2.5 mb-0.5">
              <span className="text-[38px] font-bold text-white tracking-tight leading-none tabular-nums" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                {formatBalance(balance)}
              </span>
              <span className="text-[15px] font-semibold text-white/25 mb-1">USDC</span>
            </div>
            <p className="text-[12px] text-white/25 font-medium">
              ≈ ${balanceValue.toFixed(2)} USD
            </p>
          </div>
        </div>

        {/* Monthly spend */}
        <div className="stat-card group border-border">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 to-orange-400" />
          <div className="relative p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/12">
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Monthly</p>
            </div>
            <p className="text-[26px] font-bold tracking-tight leading-none truncate">{formatUSDC(monthlySpend)}</p>
            <p className="text-xs text-muted-foreground/70 font-medium">Estimated outgoing</p>
          </div>
        </div>

        {/* Active subscriptions */}
        <div className="stat-card group border-border">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="relative p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/12">
                <CreditCard className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Subscriptions</p>
            </div>
            <p className="text-[26px] font-bold tracking-tight leading-none">{activePoliciesCount}</p>
            <p className="text-xs text-muted-foreground/70 font-medium">Active policies</p>
          </div>
        </div>

        {/* Next charge — only shows on lg (4-col layout) */}
        <div className="stat-card group border-border hidden lg:block">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-amber-500 to-yellow-400" />
          <div className="relative p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/12">
                <Calendar className="h-4 w-4 text-amber-500" />
              </div>
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Next Charge</p>
            </div>
            <p className="text-[26px] font-bold tracking-tight leading-none">{nextChargeTime}</p>
            <p className="text-xs text-muted-foreground/70 font-medium truncate">{nextMerchant}</p>
          </div>
        </div>

      </div>
    </>
  )
}
