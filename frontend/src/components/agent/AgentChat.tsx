import * as React from 'react'
import { Send, Bot, User, ArrowDownUp, X, Zap, RotateCcw } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '../../lib/utils'
import type { AgentMessage, AgentAction } from '../../hooks/useAgent'

interface AgentChatProps {
  messages: AgentMessage[]
  isLoading: boolean
  error: string | null
  onSend: (text: string) => void
  onClear: () => void
  onAction: (action: AgentAction) => void
}

const SUGGESTIONS = [
  'Show my active subscriptions',
  'Show me the latest ERC-8183 jobs',
  'Post a job to analyze my spending, 1 USDC budget',
  'Show ecosystem stats',
]

function ActionButton({ action, onAction }: { action: AgentAction; onAction: (a: AgentAction) => void }) {
  const icons: Record<AgentAction['type'], React.ReactNode> = {
    cancel: <X className="h-3.5 w-3.5" />,
    bridge: <ArrowDownUp className="h-3.5 w-3.5" />,
    subscribe: <Zap className="h-3.5 w-3.5" />,
  }

  const colors: Record<AgentAction['type'], string> = {
    cancel: 'border-red-500/30 text-red-400 hover:bg-red-500/10',
    bridge: 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10',
    subscribe: 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10',
  }

  return (
    <button
      onClick={() => onAction(action)}
      className={cn(
        'flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
        colors[action.type]
      )}
      title={action.reason}
    >
      {icons[action.type]}
      {action.label}
    </button>
  )
}

function MessageBubble({ message, onAction }: { message: AgentMessage; onAction: (a: AgentAction) => void }) {
  const isUser = message.role === 'user'

  return (
    <div className={cn('flex gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      {/* Avatar */}
      <div className={cn(
        'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full mt-0.5',
        isUser
          ? 'bg-violet-500/20 text-violet-300'
          : 'bg-white/[0.06] text-white/50'
      )}>
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble + actions */}
      <div className={cn('flex max-w-[80%] flex-col gap-2', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-violet-600/30 text-white rounded-tr-sm'
            : 'bg-white/[0.06] text-white/85 rounded-tl-sm'
        )}>
          {isUser ? message.content : (
            <ReactMarkdown
              components={{
                a: ({ href, children }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-violet-400 underline hover:text-violet-300">
                    {children}
                  </a>
                ),
                p: ({ children }) => <p className="mb-1 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                code: ({ children }) => <code className="bg-white/10 rounded px-1 text-xs font-mono">{children}</code>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Action buttons */}
        {message.actions && message.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.actions.map((action, i) => (
              <ActionButton key={i} action={action} onAction={onAction} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/50 mt-0.5">
        <Bot className="h-3.5 w-3.5" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white/[0.06] px-4 py-3">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-white/40 animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export function AgentChat({ messages, isLoading, error: _error, onSend, onClear, onAction }: AgentChatProps) {
  const [input, setInput] = React.useState('')
  const bottomRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')
    onSend(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const showSuggestions = messages.length <= 1

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/20">
            <Bot className="h-4 w-4 text-violet-300" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Payment Agent</p>
            <p className="text-[10px] text-white/30">Powered by Claude on Arc</p>
          </div>
        </div>
        <button
          onClick={onClear}
          className="flex items-center gap-1 text-[11px] text-white/30 hover:text-white/60 transition-colors"
        >
          <RotateCcw className="h-3 w-3" />
          New chat
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} onAction={onAction} />
        ))}
        {isLoading && <TypingIndicator />}

        {/* Suggestions (shown when chat is fresh) */}
        {showSuggestions && !isLoading && (
          <div className="pt-2">
            <p className="text-[11px] text-white/25 mb-2 px-1">Try asking:</p>
            <div className="flex flex-col gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => onSend(s)}
                  className="text-left text-[12px] text-white/40 hover:text-white/70 hover:bg-white/[0.04] rounded-lg px-3 py-2 transition-colors border border-white/[0.04] hover:border-white/[0.08]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/[0.08] px-3 py-2 focus-within:border-violet-500/30 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your subscriptions..."
            disabled={isLoading}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/25 outline-none disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-violet-500 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-violet-400 transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
