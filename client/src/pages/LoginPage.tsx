import { useState, type FormEvent } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ApiError } from '../api'
import { useAuth } from '../AuthContext'

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to="/inquiries" replace />

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim() || !password) {
      setError('Enter your email and password')
      return
    }
    setSubmitting(true)
    try {
      await login(email, password)
      navigate(location.state?.from ?? '/inquiries', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="container narrow">
      <h1>Sign in</h1>
      <p className="muted">Customer Inquiry Management</p>
      <form onSubmit={handleSubmit} noValidate className="card">
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        </label>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </main>
  )
}
