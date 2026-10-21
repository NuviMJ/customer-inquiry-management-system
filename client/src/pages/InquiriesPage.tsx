import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { formatDate } from '../format'
import { STATUSES, type Inquiry } from '../types'

export function InquiriesPage() {
  const { user } = useAuth()
  const [status, setStatus] = useState('')
  const [q, setQ] = useState('')
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const data = await api.listInquiries({ status, q })
      setInquiries(data.inquiries)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load inquiries')
    } finally {
      setLoading(false)
    }
  }

  // Reload when filters change; the short delay stops a request per keystroke
  useEffect(() => {
    const timer = setTimeout(load, 300)
    return () => clearTimeout(timer)
  }, [status, q])

  const filtering = status !== '' || q.trim() !== ''

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Inquiries</h1>
          <p className="muted">
            {user?.role === 'manager' ? 'All inquiries' : 'Inquiries assigned to you'}
          </p>
        </div>
        <Link to="/inquiries/new" className="btn btn-primary">New inquiry</Link>
      </div>

      <div className="toolbar">
        <label>
          Search
          <input
            type="search"
            placeholder="Customer, subject or contact"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </label>
        <label className="short">
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>

      {loading && <p className="muted center">Loading inquiries…</p>}

      {!loading && error && (
        <div className="alert alert-error" role="alert">
          {error}{' '}
          <button className="btn" onClick={load}>Retry</button>
        </div>
      )}

      {!loading && !error && inquiries.length === 0 && (
        <div className="card center">
          {filtering ? (
            <p className="muted">No inquiries match your search.</p>
          ) : (
            <>
              <p className="muted">No inquiries yet.</p>
              <Link to="/inquiries/new" className="btn btn-primary">Record the first one</Link>
            </>
          )}
        </div>
      )}

      {!loading && !error && inquiries.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Subject</th>
              <th>Assigned to</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.map((i) => (
              <tr key={i.id}>
                <td>{i.id}</td>
                <td>
                  {i.customerName}
                  <div className="muted">{i.contact}</div>
                </td>
                <td><Link to={`/inquiries/${i.id}`}>{i.subject}</Link></td>
                <td>{i.assignedTo.name}</td>
                <td><PriorityBadge priority={i.priority} /></td>
                <td><StatusBadge status={i.status} /></td>
                <td className="muted">{formatDate(i.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}
