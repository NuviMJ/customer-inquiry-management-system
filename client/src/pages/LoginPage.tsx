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

  if (user) return <Navigate to="/" replace />

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
      navigate(location.state?.from ?? '/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login">
      <div className="login-form-side">
        <form onSubmit={handleSubmit} noValidate className="login-form">
          <div className="login-brand">
            <img src="/logo.png" alt="" className="brand-logo" />
            Coffee Ninja
          </div>
          <h1>Welcome back</h1>
          <p className="muted">Sign in to the inquiry workspace.</p>
          <label>
            Email
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" autoFocus />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </label>
          {error && <p className="alert alert-error" role="alert">{error}</p>}
          <button className="btn btn-navy btn-block" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      <div className="login-panel">
        <div className="login-panel-ring ring-1"></div>
        <div className="login-panel-ring ring-2"></div>
        <div className="login-panel-text">
          <img src="/logo.png" alt="Coffee Ninja" className="login-panel-logo" />
          <h2>Every customer inquiry, tracked from first contact to resolved.</h2>
          <p>Record requests, see who is handling them, and move each one through New, In Progress and Resolved.</p>
        </div>
      </div>
    </div>
  )
}
