import * as React from 'react'
import { Bot, Zap, Activity, CreditCard, ArrowDownUp, X, ShieldCheck, ExternalLink, Star, Briefcase, Globe } from 'lucide-react'
import { useWallet } from '../hooks'
import { useChain } from '../contexts/ChainContext'
import { useAgent } from '../hooks/useAgent'
import { useRevokePolicy } from '../hooks/useRevokePolicy'
import { useAgentIdentity } from '../hooks/useAgentIdentity'
import { useMultiChainBalance } from '../hooks/useMultiChainBalance'
import { AgentChat } from '../components/agent/AgentChat'
import { ReputationFeed } from '../components/agent/ReputationFeed'
import { JobsFeed } from '../components/agent/JobsFeed'
import type { AgentAction } from '../hooks/useAgent'
import { USDCLogo, ArcLogo } from '../components/ui/chain-logos'
import { FundWalletCard } from '../components/FundWallet'
import { ERC8004_ADDRESSES } from '../config/erc8004'

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] border border-white/[0.06] px-3 py-2">
      <span className="text-white/40">{icon}</span>
      <div>
        <p className="text-[10px] text-white/30 leading-none">{label}</p>
        <p className="text-sm font-semibold text-white leading-tight mt-0.5">{value}</p>
      </div>
    </div>
  )
}

type SidebarTab = 'capabilities' | 'reputation' | 'jobs'

export function AgentPage() {
  const { account, balance, fetchBalance } = useWallet()
  const { chainConfig } = useChain()
  const { revokePolicy } = useRevokePolicy()
  const { identity } = useAgentIdentity()
  const { balances, totalUSDC, settlementUSDC } = useMultiChainBalance(account?.address)
  const [showBridge, setShowBridge] = React.useState(false)
  const [sidebarTab, setSidebarTab] = React.useState<SidebarTab>('capabilities')

  const { messages, sendMessage, isLoading, error, clearMessages } = useAgent({
    userAddress: account?.address,
    balance: balance ? String(Math.round(parseFloat(balance) * 1_000_000)) : null,
    chainId: chainConfig.chain.id,
  })

  const formatBalance = (bal: string | null) => {
    if (!bal) return '—'
    return `$${parseFloat(bal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleAction = React.useCallback(async (action: AgentAction) => {
    if (action.type === 'cancel' && action.policyId) {
      try {
        await revokePolicy(action.policyId as `0x${string}`)
      } catch (err) {
        console.error('Cancel failed:', err)
      }
    } else if (action.type === 'bridge') {
      setShowBridge(true)
    } else if (action.type === 'subscribe') {
      // handled in chat
    }
  }, [revokePolicy])

  return (
    <div className="flex flex-col h-full min-h-0 bg-[hsl(252_20%_97%)] relative">

      {/* Bridge modal overlay */}
      {showBridge && (
        <div className="absolute inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[hsl(255_45%_8%)] rounded-t-2xl md:rounded-2xl border border-white/[0.08] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
              <div>
                <p className="text-sm font-semibold text-white">Bridge USDC to Arc</p>
                <p className="text-[11px] text-white/40">Transfer from any supported chain</p>
              </div>
              <button
                onClick={() => { setShowBridge(false); fetchBalance() }}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4">
              {account?.address && (
                <FundWalletCard
                  destinationAddress={account.address}
                  onSuccess={() => { setShowBridge(false); fetchBalance() }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Page header */}
      <div className="flex-shrink-0 border-b border-border/50 bg-white/60 backdrop-blur-sm px-4 md:px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-violet-100">
                <Bot className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <h1 className="text-base font-semibold text-foreground">Payment Agent</h1>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                AI-Powered
              </span>
              {identity?.isValidated && (
                <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold text-violet-700 flex items-center gap-1">
                  <ShieldCheck className="h-2.5 w-2.5" /> ERC-8004
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Autonomous subscription intelligence on Arc — sub-second finality, $0.01 USDC fees
            </p>
          </div>
        </div>

        {/* Context pills */}
        <div className="flex gap-2 mt-3 flex-wrap">
          <StatPill
            icon={<USDCLogo size={12} />}
            label="USDC Balance"
            value={formatBalance(balance)}
          />
          <StatPill
            icon={<ArcLogo size={12} />}
            label="Network"
            value={chainConfig.shortName}
          />
          <StatPill
            icon={<Zap className="h-3 w-3" />}
            label="Settlement"
            value="<1s on Arc"
          />
          <StatPill
            icon={<Activity className="h-3 w-3" />}
            label="Tx Fee"
            value="~$0.01 USDC"
          />
          {Number(totalUSDC) > Number(settlementUSDC) && (
            <StatPill
              icon={<Globe className="h-3 w-3" />}
              label="All Chains Total"
              value={`$${totalUSDC} USDC`}
            />
          )}
        </div>
      </div>

      {/* Chat panel */}
      <div className="flex-1 min-h-0 flex">
        {/* Main chat area */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex-1 min-h-0 bg-[hsl(255_45%_8%)]">
            <AgentChat
              messages={messages}
              isLoading={isLoading}
              error={error}
              onSend={sendMessage}
              onClear={clearMessages}
              onAction={handleAction}
            />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:flex flex-col w-72 border-l border-border/50 bg-white/40 overflow-hidden">
          {/* Sidebar tabs */}
          <div className="flex border-b border-border/50 flex-shrink-0">
            {([
              { key: 'capabilities', label: 'Tools', icon: <Bot className="h-3 w-3" /> },
              { key: 'reputation',   label: 'Reputation', icon: <Star className="h-3 w-3" /> },
              { key: 'jobs',         label: 'Jobs', icon: <Briefcase className="h-3 w-3" /> },
            ] as { key: SidebarTab; label: string; icon: React.ReactNode }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setSidebarTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[10px] font-semibold transition-colors border-b-2 ${
                  sidebarTab === tab.key
                    ? 'text-violet-600 border-violet-500 bg-violet-50/50'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/20'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sidebar tab content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">

            {sidebarTab === 'capabilities' && (
              <>
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                    What I can do
                  </p>
                  <div className="space-y-2">
                    {[
                      { icon: <CreditCard className="h-3.5 w-3.5" />,    text: 'Review active subscriptions' },
                      { icon: <Activity className="h-3.5 w-3.5" />,      text: 'Analyze spending patterns' },
                      { icon: <Zap className="h-3.5 w-3.5" />,           text: 'Spot unused subscriptions' },
                      { icon: <ArrowDownUp className="h-3.5 w-3.5" />,   text: 'Recommend fund top-ups' },
                      { icon: <Bot className="h-3.5 w-3.5" />,           text: 'Cancel risky policies' },
                      { icon: <Globe className="h-3.5 w-3.5" />,         text: 'Show ecosystem stats' },
                      { icon: <Briefcase className="h-3.5 w-3.5" />,     text: 'Browse ERC-8183 jobs' },
                    ].map(({ icon, text }) => (
                      <div key={text} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                        <span className="text-violet-500 flex-shrink-0">{icon}</span>
                        {text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multi-chain balances */}
                {balances.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      USDC Across Chains
                    </p>
                    <div className="space-y-1">
                      {/* Settlement chain first, highlighted */}
                      {balances.filter(b => b.isSettlement).map(b => (
                        <div key={b.chainKey} className="flex items-center justify-between rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-1.5">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-semibold text-violet-700">{b.shortName}</span>
                            <span className="text-[8px] rounded bg-violet-200 text-violet-600 px-1 py-0.5 font-bold uppercase tracking-wide">Settlement</span>
                          </div>
                          <span className="text-[10px] font-bold text-violet-700">${b.balanceUSDC}</span>
                        </div>
                      ))}
                      {/* Source chains — only show non-zero */}
                      {balances.filter(b => !b.isSettlement && b.balanceRaw > 0n).map(b => (
                        <div key={b.chainKey} className="flex items-center justify-between rounded-lg bg-white/60 border border-border/50 px-2.5 py-1.5">
                          <span className="text-[10px] text-muted-foreground">{b.shortName}</span>
                          <span className="text-[10px] font-semibold text-foreground">${b.balanceUSDC}</span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between rounded-lg bg-muted/30 border border-border/40 px-2.5 py-1.5">
                        <span className="text-[10px] font-semibold text-muted-foreground">Total</span>
                        <span className="text-[10px] font-bold text-foreground">${totalUSDC} USDC</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* ERC-8004 identity */}
                {identity ? (
                  <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-violet-700">Onchain Identity</p>
                      <a
                        href={`https://testnet.arcscan.app/token/${ERC8004_ADDRESSES.identity}/${identity.agentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-violet-400 hover:text-violet-600 transition-colors"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-violet-500">Agent ID</span>
                        <span className="text-[10px] font-semibold text-violet-700">#{identity.agentId}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-violet-500">Standard</span>
                        <span className="text-[10px] font-semibold text-violet-700">ERC-8004</span>
                      </div>
                      {identity.isValidated && (
                        <div className="flex items-center gap-1 mt-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                          <span className="text-[10px] font-semibold text-emerald-700">Validated onchain</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl bg-violet-50 border border-violet-100 p-3">
                    <p className="text-[11px] font-semibold text-violet-700 mb-1">Powered by Arc</p>
                    <p className="text-[10px] text-violet-500 leading-relaxed">
                      Sub-second finality means the agent acts on decisions instantly.
                    </p>
                  </div>
                )}
              </>
            )}

            {sidebarTab === 'reputation' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ERC-8004 Reputation
                  </p>
                  {identity && (
                    <a
                      href={`https://testnet.arcscan.app/address/${ERC8004_ADDRESSES.reputation}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                {identity && (
                  <div className="flex items-center justify-between rounded-lg bg-violet-50 border border-violet-200 px-2.5 py-2">
                    <span className="text-[10px] text-violet-500">Agent #{identity.agentId}</span>
                    {identity.isValidated && (
                      <div className="flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-emerald-500" />
                        <span className="text-[10px] font-semibold text-emerald-600">Validated</span>
                      </div>
                    )}
                  </div>
                )}
                <ReputationFeed />
              </>
            )}

            {sidebarTab === 'jobs' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    ERC-8183 Jobs
                  </p>
                  <a
                    href={`https://testnet.arcscan.app/address/0x0747EEf0706327138c69792bF28Cd525089e4583`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Onchain job marketplace. Post a job for the Cadence agent to execute on your behalf — powered by USDC escrow on Arc.
                </p>
                <JobsFeed userAddress={account?.address} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
