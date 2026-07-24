import './index.css'
import { useState, useEffect, useMemo, useRef } from 'react'
import supabase from './supabaseClient'
import Login from './Login'
import Home from './Home'
import MarqueeFooter from './MarqueeFooter'
import { ProfileMenu } from './Home'

export default function App() {
  const [claims, setClaims] = useState(null)

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
    supabase.auth.getClaims().then(({ data }) => {
      setClaims(data?.claims ?? null)
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
        <ProfileMenu claims={claims} onLogout={handleLogout} />
      </div>
      
      <div className='front-main'>
        {authLoading ? (
          <div className="board-status" style={{alignSelf: 'center', padding: 40}}>Loading…</div>
        ) : claims ? (
          <Home claims={claims} onLogout={handleLogout} />
        ) : (
          <Login
            verifying={verifying}
            authError={authError}
            setAuthError={setAuthError}
            authSuccess={authSuccess}
            claims={claims}
          />
        )}
      </div>
      <MarqueeFooter />
    </>
  )
}