// Shared Supabase auth helper — included by all merchant pages
// Uses the anon key (safe for client-side)

const SUPABASE_URL = 'https://mxyjegfubewczsewmkvi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14eWplZ2Z1YmV3Y3pzZXdta3ZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzExNzYyMTEsImV4cCI6MjA4Njc1MjIxMX0.JWsf39UlmdduM6qYBZB2Q7G3ueyOHAxLgdK17M1Stu8'

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function getSession() {
  const { data: { session } } = await sb.auth.getSession()
  return session
}

async function getAccessToken() {
  const session = await getSession()
  return session?.access_token || null
}

async function requireAuth() {
  const session = await getSession()
  if (!session) {
    // Preserve the current page so login can redirect back after auth
    const redirect = encodeURIComponent(window.location.pathname + window.location.search)
    window.location.href = `/login?redirect=${redirect}`
    return null
  }
  return session
}

async function handleLogout() {
  await sb.auth.signOut()
  window.location.href = '/login'
}
