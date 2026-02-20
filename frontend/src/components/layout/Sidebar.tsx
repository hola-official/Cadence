import { cn } from '../../lib/utils'
import {
  LayoutDashboard,
  CreditCard,
  Activity,
  Settings,
  LogOut,
  X,
  Beaker,
  ArrowDownUp,
  BookOpen,
  ExternalLink,
  Zap,
} from 'lucide-react'
import { Button } from '../ui/button'
import { useAuth } from '../../hooks'
import { ArbitrumLogo, USDCLogo } from '../ui/chain-logos'

export type NavItem = 'dashboard' | 'subscriptions' | 'activity' | 'bridge' | 'settings' | 'demo' | 'docs'

interface SidebarProps {
  currentPage: NavItem
  onNavigate: (page: NavItem) => void
  mobileOpen?: boolean
  onClose?: () => void
}

// Main navigation items
const mainNavItems: { id: NavItem; label: string; icon: React.ReactNode; description?: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
  { id: 'subscriptions', label: 'Subscriptions', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'activity', label: 'Activity', icon: <Activity className="h-4 w-4" /> },
  { id: 'bridge', label: 'Bridge', icon: <ArrowDownUp className="h-4 w-4" />, description: 'Move funds across chains' },
  { id: 'settings', label: 'Settings', icon: <Settings className="h-4 w-4" /> },
]

// Beta/Developer items (shown at bottom)
const betaNavItems: { id: NavItem; label: string; icon: React.ReactNode }[] = [
  { id: 'demo', label: 'SDK Demo', icon: <Beaker className="h-4 w-4" /> },
  { id: 'docs', label: 'Docs', icon: <BookOpen className="h-4 w-4" /> },
]

export function Sidebar({ currentPage, onNavigate, mobileOpen = false, onClose }: SidebarProps) {
  const { logout } = useAuth()

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div
        className={cn(
          'fixed inset-0 z-[55] bg-black/60 backdrop-blur-sm transition-opacity duration-300 md:hidden',
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-[60] flex w-[260px] md:w-[220px] flex-col flex-shrink-0 border-r border-white/[0.06] transition-transform duration-300 ease-in-out',
          'sidebar-gradient',
          'md:static md:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* ── Brand Header ── */}
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            {/* Cadence icon mark */}
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/30 flex-shrink-0">
              <Zap className="h-4 w-4 text-white" />
            </div>
            {/* Wordmark */}
            <div>
              <p className="text-[15px] font-bold text-white tracking-tight leading-none">Cadence</p>
              <p className="text-[10px] text-white/30 font-medium leading-none mt-0.5">Protocol</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 md:hidden transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Network Badge ── */}
        <div className="mx-3 mb-3">
          <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-3 py-2">
            <ArbitrumLogo size={14} className="flex-shrink-0" />
            <span className="text-[11px] font-medium text-white/50">Arbitrum Sepolia</span>
            <div className="ml-auto h-1.5 w-1.5 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
          </div>
        </div>

        {/* ── Main Navigation ── */}
        <nav className="flex-1 space-y-0.5 px-2 pt-1">
          <p className="px-2 mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/20">Main</p>
          {mainNavItems.map((item) => {
            const isActive = currentPage === item.id
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-[13px] font-medium transition-all duration-200 group',
                  isActive
                    ? 'bg-white/[0.10] text-white'
                    : 'text-white/45 hover:bg-white/[0.05] hover:text-white/75'
                )}
              >
                {/* Active left accent */}
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-gradient-to-b from-violet-400 to-purple-500 shadow-sm shadow-violet-500/50" />
                )}
                <span className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0 transition-all duration-200',
                  isActive
                    ? 'bg-violet-500/25 text-violet-300'
                    : 'text-white/35 group-hover:text-white/60 group-hover:bg-white/[0.05]'
                )}>
                  {item.icon}
                </span>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && (
                  <div className="h-1.5 w-1.5 rounded-full bg-violet-400/70 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>

        {/* ── Dev / Beta Section ── */}
        <div className="px-2 pb-2">
          <div className="my-2 flex items-center gap-2 px-2">
            <div className="h-px flex-1 bg-white/[0.06]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-amber-400/60">
              Dev Tools
            </span>
            <div className="h-px flex-1 bg-white/[0.06]" />
          </div>
          <div className="space-y-0.5">
            {betaNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-200 group',
                  currentPage === item.id
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                    : 'text-white/35 hover:bg-white/[0.04] hover:text-white/55'
                )}
              >
                <span className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 transition-all duration-200',
                  currentPage === item.id
                    ? 'bg-amber-500/20 text-amber-300'
                    : 'text-current group-hover:bg-white/[0.04]'
                )}>
                  {item.icon}
                </span>
                {item.label}
              </button>
            ))}
            <a
              href="https://merchant-checkout-demo-production.up.railway.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-[12px] font-medium transition-all duration-200 text-white/35 hover:bg-white/[0.04] hover:text-white/55 group"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-md flex-shrink-0 text-current group-hover:bg-white/[0.04]">
                <ExternalLink className="h-3.5 w-3.5" />
              </span>
              Live Demo
            </a>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-white/[0.06] px-2 py-3 space-y-2">
          {/* USDC indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.03]">
            <USDCLogo size={14} className="flex-shrink-0" />
            <span className="text-[10px] font-medium text-white/30 flex-1">USDC Payments</span>
            <span className="text-[9px] text-white/20 font-mono">ERC-4337</span>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-[12px] text-white/30 hover:text-red-400 hover:bg-red-500/10 rounded-lg h-8"
            onClick={logout}
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  )
}
