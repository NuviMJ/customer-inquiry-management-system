import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { statusIcon } from '../components/Badges'
import { InquiryTable } from '../components/InquiryTable'
import { PageHeader } from '../components/PageHeader'
import { STATUSES, type Inquiry } from '../types'
import { isOpen, isStale, sortByUrgency } from '../urgency'

// Dashboard cards link here with ?focus=...
const focusLabel: Record<string, string> = {
  open: 'Open inquiries',
  high: 'High priority open',
  stale: 'No update in 24h',
  unassigned: 'Unassigned',
  mine: 'My open work',
}

export function InquiriesPage() {
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const status = params.get('status') ?? ''
  const focus = params.get('focus') ?? ''
  const [q, setQ] = useState('')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listInquiries({ q })
      setInquiries(data.inquiries)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load inquiries')
    } finally {
      setLoading(false)
    }
  }

  // Search goes to the server; the short delay stops a request per keystroke
  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [q])

  function setStatus(next: string) {
    const nextParams = new URLSearchParams(params)
    if (next) nextParams.set('status', next)
    else nextParams.delete('status')
    setParams(nextParams)
  }

  // Tabs and focus are applied in the browser so tab counts stay visible
  let visible = inquiries
  if (focus === 'open') visible = visible.filter(isOpen)
  if (focus === 'high') visible = visible.filter((i) => isOpen(i) && i.priority === 'High')
  if (focus === 'stale') visible = visible.filter(isStale)
  if (focus === 'unassigned') visible = visible.filter((i) => isOpen(i) && i.assignedTo === null)
  if (focus === 'mine') visible = visible.filter((i) => isOpen(i) && i.assignedTo?.id === user?.id)
  if (status) visible = visible.filter((i) => i.status === status)
  visible = sortByUrgency(visible)

  const filtering = status !== '' || focus !== '' || q.trim() !== ''

  // Staff get two sections so the shared pool and their own work are never mixed
  const split = user?.role === 'staff' && !focus
  const pool = visible.filter((i) => i.assignedTo === null)
  const mine = visible.filter((i) => i.assignedTo !== null)

  return (
    <>
      <PageHeader title="Inquiries" action={<Link to="/inquiries/new" className="btn btn-primary">+ New inquiry</Link>} />
      <main className="page">
        <div>
          <h1>Inquiries</h1>
          <div className="sub">
            {user?.role === 'manager' ? 'All inquiries' : 'Inquiries assigned to you or unassigned'}, sorted by what needs attention first
          </div>
        </div>

        {focus && focusLabel[focus] && (
          <div>
            <span className="focus-chip">
              Showing: {focusLabel[focus]} <Link to="/inquiries" aria-label="Clear focus">✕</Link>
            </span>
          </div>
        )}

        <div className="toolbar">
          <div className="tabs" role="tablist">
            <button className={`tab ${status === '' ? 'active' : ''}`} onClick={() => setStatus('')}>
              All <span className="count">{inquiries.length}</span>
            </button>
            {STATUSES.map((s) => (
              <button key={s} className={`tab ${status === s ? 'active' : ''}`} onClick={() => setStatus(s)}>
                {statusIcon[s]} {s} <span className="count">{inquiries.filter((i) => i.status === s).length}</span>
              </button>
            ))}
          </div>
          <label>
            Search
            <input
              className="search"
              type="search"
              placeholder="Customer, subject or contact"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>
        </div>

        {loading && <p className="muted center">Loading inquiries…</p>}

        {!loading && error && (
          <div className="alert alert-error" role="alert">
            {error} <button className="btn" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="card center">
            {filtering ? (
              <p className="muted">No inquiries match your filters.</p>
            ) : (
              <>
                <p className="muted">No inquiries yet.</p>
                <Link to="/inquiries/new" className="btn btn-primary">Record the first one</Link>
              </>
            )}
          </div>
        )}

        {!loading && !error && visible.length > 0 && !split && <InquiryTable inquiries={visible} />}

        {!loading && !error && visible.length > 0 && split && (
          <>
            <section className="section">
              <div className="section-head">
                <h2>Unassigned <span className="count">{pool.length}</span></h2>
                <span className="muted">Available for anyone to claim</span>
              </div>
              {pool.length > 0 ? (
                <InquiryTable inquiries={pool} />
              ) : (
                <div className="card center muted">No unassigned inquiries right now.</div>
              )}
            </section>
            <section className="section">
              <div className="section-head">
                <h2>Assigned to me <span className="count">{mine.length}</span></h2>
                <span className="muted">Only you or a manager can change these</span>
              </div>
              {mine.length > 0 ? (
                <InquiryTable inquiries={mine} />
              ) : (
                <div className="card center muted">Nothing assigned to you. Claim one from the list above.</div>
              )}
            </section>
          </>
        )}
      </main>
    </>
  )
}
