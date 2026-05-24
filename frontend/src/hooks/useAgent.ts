import { useState, useCallback } from 'react'

const RELAYER_URL = import.meta.env.VITE_RELAYER_URL || 'https://cadence-relayer.onrender.com'

export interface AgentAction {
  type: 'cancel' | 'bridge' | 'subscribe'
  policyId?: string
  amount?: string
  label: string
  reason: string
}

export interface AgentMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  actions?: AgentAction[]
}

interface UseAgentParams {
  userAddress?: string
  balance?: string | null
  chainId: number
}

export function useAgent({ userAddress, balance, chainId }: UseAgentParams) {
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your Cadence Payment Agent. I can analyze your subscriptions, spot unused ones, warn you about low balance, and help you manage payments on Arc. What would you like to know?",
    },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(async (text: string) => {
    if (!userAddress || isLoading) return

    const userMsg: AgentMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
    }

    setMessages(prev => [...prev, userMsg])
    setIsLoading(true)
    setError(null)

    // Build history — exclude welcome + error messages so they never confuse the LLM
    const history = messages
      .filter(m => m.id !== 'welcome' && !m.id.startsWith('error-'))
      .map(m => ({ role: m.role, content: m.content }))

    const payload = { userAddress, message: text, history, chainId, balance: balance ?? undefined }

    async function callAgent() {
      const res = await fetch(`${RELAYER_URL}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }))
        throw new Error(err.error || `HTTP ${res.status}`)
      }
      return res.json() as Promise<{ reply: string; actions: AgentAction[] }>
    }

    try {
      let data: { reply: string; actions: AgentAction[] }
      try {
        data = await callAgent()
      } catch {
        // Auto-retry once on transient failure (cold start, restart, etc.)
        await new Promise(r => setTimeout(r, 1500))
        data = await callAgent()
      }

      setMessages(prev => [...prev, {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.reply,
        actions: data.actions?.length ? data.actions : undefined,
      }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Agent request failed'
      setError(message)
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I ran into an error: ${message}. Please try again.`,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [userAddress, balance, chainId, messages, isLoading])

  const clearMessages = useCallback(() => {
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: "Hi! I'm your Cadence Payment Agent. I can analyze your subscriptions, spot unused ones, warn you about low balance, and help you manage payments on Arc. What would you like to know?",
    }])
    setError(null)
  }, [])

  return { messages, sendMessage, isLoading, error, clearMessages }
}
