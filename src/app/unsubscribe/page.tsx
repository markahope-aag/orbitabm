'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [status, setStatus] = useState<'loading' | 'confirm' | 'done' | 'error'>('loading')
  const [email, setEmail] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setErrorMessage('Missing unsubscribe token.')
      return
    }

    fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEmail(data.email)
          setOrgName(data.organization_name)
          setStatus('confirm')
        } else {
          setStatus('error')
          setErrorMessage(data.error || 'Invalid or expired link.')
        }
      })
      .catch(() => {
        setStatus('error')
        setErrorMessage('Something went wrong. Please try again.')
      })
  }, [token])

  async function handleUnsubscribe() {
    setStatus('loading')
    try {
      const res = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = await res.json()
      if (data.success) {
        setStatus('done')
      } else {
        setStatus('error')
        setErrorMessage(data.error || 'Failed to unsubscribe.')
      }
    } catch {
      setStatus('error')
      setErrorMessage('Something went wrong. Please try again.')
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f5f5f5',
      fontFamily: 'Arial, Helvetica, sans-serif',
      padding: '20px',
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '40px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        textAlign: 'center',
      }}>
        {status === 'loading' && (
          <p style={{ color: '#666' }}>Loading...</p>
        )}

        {status === 'confirm' && (
          <>
            <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '16px' }}>
              Unsubscribe
            </h1>
            <p style={{ color: '#666', marginBottom: '8px' }}>
              You are about to unsubscribe:
            </p>
            <p style={{ color: '#333', fontWeight: 'bold', marginBottom: '24px' }}>
              {email}
            </p>
            {orgName && (
              <p style={{ color: '#999', fontSize: '14px', marginBottom: '24px' }}>
                From emails sent by {orgName}
              </p>
            )}
            <button
              onClick={handleUnsubscribe}
              style={{
                backgroundColor: '#dc2626',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '12px 32px',
                fontSize: '16px',
                cursor: 'pointer',
              }}
            >
              Confirm Unsubscribe
            </button>
          </>
        )}

        {status === 'done' && (
          <>
            <h1 style={{ fontSize: '24px', color: '#333', marginBottom: '16px' }}>
              Unsubscribed
            </h1>
            <p style={{ color: '#666' }}>
              You have been successfully unsubscribed. You will no longer receive emails from us.
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 style={{ fontSize: '24px', color: '#dc2626', marginBottom: '16px' }}>
              Error
            </h1>
            <p style={{ color: '#666' }}>
              {errorMessage}
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}>
        Loading...
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
