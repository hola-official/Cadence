import * as React from 'react'
import { Briefcase, ExternalLink, Clock, Copy, Check } from 'lucide-react'
import { useAgentJobs } from '../../hooks/useAgentJobs'
import type { JobStatus } from '../../config/erc8183'

const STATUS_STYLE: Record<JobStatus, string> = {
  Open:      'text-blue-600 bg-blue-50',
  Funded:    'text-violet-600 bg-violet-50',
  Submitted: 'text-amber-600 bg-amber-50',
  Completed: 'text-emerald-600 bg-emerald-50',
  Rejected:  'text-red-600 bg-red-50',
  Expired:   'text-muted-foreground bg-muted/40',
}

interface JobsFeedProps {
  userAddress?: string
}

function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => {
    navigator.clipboard.writeText(id)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-[10px] font-mono font-semibold text-violet-500 hover:text-violet-400 transition-colors">
      #{id}
      {copied ? <Check className="h-2.5 w-2.5 text-emerald-400" /> : <Copy className="h-2.5 w-2.5 opacity-50" />}
    </button>
  )
}

export function JobsFeed({ userAddress }: JobsFeedProps) {
  const { jobs, isLoading } = useAgentJobs(userAddress)

  if (isLoading && jobs.length === 0) {
    return (
      <div className="space-y-2">
        {[1, 2].map(i => (
          <div key={i} className="h-14 rounded-lg bg-muted/40 animate-pulse" />
        ))}
      </div>
    )
  }

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <Briefcase className="h-5 w-5 text-muted-foreground/40 mb-1.5" />
        <p className="text-[11px] text-muted-foreground">No jobs yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">
          ERC-8183 agentic commerce
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {jobs.slice(0, 5).map((job) => (
        <div
          key={job.jobId}
          className="rounded-lg border border-border/50 bg-white/60 px-3 py-2.5 space-y-1.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <CopyId id={job.jobId} />
                <span className="text-[9px] text-muted-foreground/40">tap to copy</span>
              </div>
              <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">
                {job.description || `Job #${job.jobId}`}
              </p>
            </div>
            <span className={`text-[9px] font-semibold rounded px-1.5 py-0.5 flex-shrink-0 ${STATUS_STYLE[job.status]}`}>
              {job.status}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              <span>{job.expiredAt < new Date() ? 'Expired' : `Expires ${job.expiredAt.toLocaleDateString()}`}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-semibold text-violet-700">${job.budgetUSDC} USDC</span>
              {job.txHash && (
                <a
                  href={`https://testnet.arcscan.app/tx/${job.txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                >
                  <ExternalLink className="h-2.5 w-2.5" />
                </a>
              )}
            </div>
          </div>
          <p className="text-[9px] text-muted-foreground">
            From: {job.client.slice(0, 6)}…{job.client.slice(-4)}
          </p>
        </div>
      ))}
    </div>
  )
}
