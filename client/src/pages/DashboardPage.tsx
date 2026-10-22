import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { StatusBadge } from '../components/Badges'
import { InquiryTable } from '../components/InquiryTable'
import { PageHeader } from '../components/PageHeader'
import { STATUSES, type Inquiry } from '../types'
import { isOpen, isStale, sortByUrgency, urgencyScore } from '../urgency'

function greeting() {
  const hour = new Date().getHours()
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
}

export function DashboardPage() {
  const { user } = useAuth()
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listInquiries({})
      setInquiries(data.inquiries)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load inquiries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const open = inquiries.filter(isOpen)
  const highOpen = open.filter((i) => i.priority === 'High')
  const stale = open.filter(isStale)
  const mine = open.filter((i) => i.assignedTo.id === user?.id)
  const needsAttention = sortByUrgency(open).filter((i) => urgencyScore(i) > 0).slice(0, 5)

  return (
    <>
      <PageHeader title="Dashboard" action={<Link to="/inquiries/new" className="btn btn-primary">+ New inquiry</Link>} />
      <main className="page">
        <div>
          <h1>{greeting()}, {user?.name.split(' ')[0]}</h1>
          <div className="sub">
            {user?.role === 'manager' ? 'What needs attention across all inquiries' : 'What needs attention in your inquiries'}
          </div>
        </div>

        {loading && <p className="muted center">Loading…</p>}

        {!loading && error && (
          <div className="alert alert-error" role="alert">
            {error} <button className="btn" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="stat-grid">
              <Link to="/inquiries?focus=open" className="card stat">
                <span className="stat-label">Open inquiries <span className="arrow">→</span></span>
                <span className="stat-value">{open.length}</span>
              </Link>
              <Link to="/inquiries?focus=high" className="card stat">
                <span className="stat-label">High priority open <span className="arrow">→</span></span>
                <span className={`stat-value ${highOpen.length ? 'problem' : ''}`}>{highOpen.length}</span>
              </Link>
              <Link to="/inquiries?focus=stale" className="card stat">
                <span className="stat-label">No update in 24h <span className="arrow">→</span></span>
                <span className={`stat-value ${stale.length ? 'problem' : ''}`}>{stale.length}</span>
              </Link>
              <Link to="/inquiries?focus=mine" className="card stat">
                <span className="stat-label">My open work <span className="arrow">→</span></span>
                <span className="stat-value">{mine.length}</span>
              </Link>
            </div>

            <div>
              <h2 style={{ marginBottom: 10 }}>Needs attention first</h2>
              {needsAttention.length > 0 ? (
                <InquiryTable inquiries={needsAttention} />
              ) : (
                <div className="card center muted">Nothing urgent right now. High priority and stale inquiries will appear here.</div>
              )}
            </div>

            <div className="status-grid">
              {STATUSES.map((s) => (
                <Link key={s} to={`/inquiries?status=${encodeURIComponent(s)}`} className="card status-tile" style={{ textDecoration: 'none' }}>
                  <StatusBadge status={s} />
                  <strong>{inquiries.filter((i) => i.status === s).length}</strong>
                </Link>
              ))}
            </div>
          </>
        )}
      </main>
    </>
  )
}
