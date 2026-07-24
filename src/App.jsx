import './index.css'
import { useState, useEffect, useMemo, useRef } from 'react'
import supabase from './supabaseClient'
import Login from './Login'
import Home from './Home'
import MarqueeFooter from './MarqueeFooter'
import { ProfileMenu } from './Home'

export default function App() {
  const [claims, setClaims] = useState(null)

  const params = new URLSearchParams(window.location.search)
  const hasTokenHash = params.get('token_hash')

  const [verifying, setVerifying] = useState(!!hasTokenHash)
  const [authError, setAuthError] = useState(null)
  const [authSuccess, setAuthSuccess] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const token_hash = params.get('token_hash')
    const type = params.get('type')

    if (token_hash) {
      supabase.auth
        .verifyOtp({ token_hash, type: type || 'email' })
        .then(({ error }) => {
          if (error) {
            setAuthError(error.message)
          } else {
            setAuthSuccess(true)
            window.history.replaceState({}, document.title, '/')
          }
          setVerifying(false)
        })
    }

    supabase.auth.getClaims().then(({ data }) => {
      setClaims(data?.claims ?? null)
    })

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

  return (
    <>
      <div style={{display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}}>
        <h1>myTaskboard</h1>
        <ProfileMenu claims={claims} onLogout={handleLogout} />
      </div>
      
      <div className='front-main'>
      {claims ? (
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