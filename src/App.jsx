import './index.css'
import { useState, useEffect, useMemo, useRef } from 'react'
import supabase from './supabaseClient'
import Login from './Login'
import Home from './Home'
import MarqueeFooter from './MarqueeFooter'
import { ProfileMenu } from './Home'

function SaveTasksPrompt({ userId }) {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState(null)

    const handleSubmit = async (event) => {
        event.preventDefault()
        setLoading(true)
        setError(null)

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: window.location.origin },
        })

        setLoading(false)
        if (error) {
            setError(error.message)
        } else {
            setSent(true)
        }
    }

    if (sent) {
        return <p style={{fontSize: 'medium'}}>Check your email for a link to continue.</p>
    }

    return (
        <form
            style={{ width: '35%', marginBottom: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', border: 'none' }}
            onSubmit={handleSubmit}
        >
            <input
                style={{ width: 'auto', flex: 1, padding: '10px', minWidth: '300px' }}
                type="email"
                placeholder="Enter your email to sign in via Magic Link"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" disabled={loading}>
                {loading ? 'Sending…' : 'Send'}
            </button>

            {error && <p style={{ color: 'red' }}>{error}</p>}
        </form>
    )
}

export default function App() {
  const [claims, setClaims] = useState(null)
  const isAnonymous = claims?.is_anonymous ?? true

  // Check URL params on initial render
  const params = new URLSearchParams(window.location.search)
  const hasTokenHash = params.get('token_hash')

  const [verifying, setVerifying] = useState(!!hasTokenHash)
  const [authError, setAuthError] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authSuccess, setAuthSuccess] = useState(false)

  useEffect(() => {
    // Check if we have token_hash in URL (magic link callback)
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = params.get('type')

    if (token_hash) {
      // Verify the OTP token
      supabase.auth
        .verifyOtp({ token_hash, type: type || 'email' })
        .then(({ error }) => {
          if (error) {
            setAuthError(error.message)
          } else {
            setAuthSuccess(true)
            // Clear URL params
            window.history.replaceState({}, document.title, '/')
          }
          setVerifying(false)
        })
    }

    // Check for existing session using getClaims + end loading screen when done
    supabase.auth.getClaims().then(async ({ data }) => {
      if (data?.claims) {
        setClaims(data.claims)
      } else {
        // No session at all — sign in anonymously so they can start using the board right away
        const { data: anonData, error } = await supabase.auth.signInAnonymously()
        if (error) {
          console.error('Anonymous sign-in failed:', error)
        } else {
          const { data: claimsData } = await supabase.auth.getClaims()
          setClaims(claimsData?.claims ?? null)
        }
      }
      setAuthLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      supabase.auth.getClaims().then(({ data }) => {
        setClaims(data?.claims ?? null)
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setClaims(null)
  }


  // Login screen with navbar and marquee footer
  return (
    <>
      <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <h1>myTaskboard</h1>
        {isAnonymous ? <SaveTasksPrompt userId={claims?.sub} /> : <ProfileMenu claims={claims} onLogout={handleLogout} />}
      </div>
      
      <div className='front-main'>
        {authLoading ? (
          <div className="board-status" style={{ alignSelf: 'center', padding: 40 }}>Loading…</div>
        ) : (
          <Home claims={claims} onLogout={handleLogout} />
        )}
      </div>
      <MarqueeFooter />
    </>
  )
}