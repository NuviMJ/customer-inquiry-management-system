import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { PriorityBadge, StatusBadge } from '../components/Badges'
import { formatDate } from '../format'
import { actionLabel, allowedTransitions } from '../status'
import type { Inquiry, Priority, Status, User } from '../types'

type Notice = { kind: 'success' | 'warn' | 'error'; text: string } | null

export function InquiryDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<User[]>([])

  async function load() {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await api.getInquiry(id)
      setInquiry(data.inquiry)
    } catch (err) {
      setLoadError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Could not load this inquiry'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [id])

  // Only managers can reassign, so only they need the staff list
  useEffect(() => {
    if (user?.role === 'manager') {
      api.listUsers().then((data) => setStaff(data.users)).catch(() => setStaff([]))
    }
  }, [user])

  async function changeStatus(next: Status) {
    if (!inquiry) return
    setSaving(true)
    setNotice(null)
    try {
      const data = await api.changeStatus(inquiry.id, next, inquiry.status)
      setInquiry(data.inquiry)
      setNotice({ kind: 'success', text: `Status changed to ${next}` })
    } catch (err) {
      if (err instanceof ApiError && err.details?.reason === 'STALE') {
        // Another tab or user changed it first: show what happened and reload
        setNotice({ kind: 'warn', text: `${err.message}. The page has been refreshed.` })
        await load()
      } else {
        setNotice({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not change the status' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function update(input: { priority?: Priority | null; assignedTo?: number }, label: string) {
    if (!inquiry) return
    setSaving(true)
    setNotice(null)
    try {
      const data = await api.updateInquiry(inquiry.id, input)
      setInquiry(data.inquiry)
      setNotice({ kind: 'success', text: `${label} updated` })
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof ApiError ? err.message : `Could not update ${label.toLowerCase()}` })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p className="muted center">Loading inquiry…</p>

  if (loadError || !inquiry) {
    const title =
      loadError?.status === 404 ? 'Inquiry not found'
      : loadError?.status === 403 ? 'You cannot view this inquiry'
      : loadError?.status === 400 ? 'Invalid inquiry link'
      : 'Something went wrong'
    return (
      <div className="card center">
        <h1>{title}</h1>
        <p className="muted">{loadError?.message}</p>
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <Link to="/inquiries" className="btn btn-primary">Back to inquiries</Link>
          {loadError?.status !== 404 && loadError?.status !== 403 && loadError?.status !== 400 && (
            <button className="btn" onClick={load}>Retry</button>
          )}
        </div>
      </div>
    )
  }

  const canReassign = user?.role === 'manager'

  return (
    <>
      <p><Link to="/inquiries">← All inquiries</Link></p>
      <div className="page-head">
        <div>
          <h1>#{inquiry.id} · {inquiry.subject}</h1>
          <p className="muted">
            Last updated by {inquiry.updatedBy.name} on {formatDate(inquiry.updatedAt)}
          </p>
        </div>
        <StatusBadge status={inquiry.status} />
      </div>

      {notice && (
        <div className={`alert alert-${notice.kind}`} role="alert">{notice.text}</div>
      )}

      <div className="card">
        <h2>Customer</h2>
        <dl className="detail-grid">
          <dt>Name</dt><dd>{inquiry.customerName}</dd>
          <dt>Contact</dt><dd>{inquiry.contact}</dd>
          <dt>Description</dt><dd style={{ whiteSpace: 'pre-wrap' }}>{inquiry.description}</dd>
          <dt>Recorded by</dt><dd>{inquiry.createdBy.name} on {formatDate(inquiry.createdAt)}</dd>
        </dl>
      </div>

      <div className="card">
        <h2>Status</h2>
        <p className="muted">
          Currently <StatusBadge status={inquiry.status} />
        </p>
        <div className="btn-row">
          {allowedTransitions(inquiry.status).map((next) => (
            <button
              key={next}
              className={`btn ${next === 'Resolved' ? 'btn-primary' : ''}`}
              disabled={saving}
              onClick={() => changeStatus(next)}
            >
              {actionLabel[next]}
            </button>
          ))}
        </div>
      </div>

      <div className="card">
        <h2>Handling</h2>
        <dl className="detail-grid">
          <dt>Priority</dt>
          <dd>
            <select
              value={inquiry.priority ?? ''}
              disabled={saving}
              onChange={(e) => update({ priority: (e.target.value || null) as Priority | null }, 'Priority')}
              style={{ maxWidth: 200 }}
            >
              <option value="">Not set</option>
              <option value="High">High</option>
              <option value="Low">Low</option>
            </select>
          </dd>
          <dt>Assigned to</dt>
          <dd>
            {canReassign ? (
              <select
                value={inquiry.assignedTo.id}
                disabled={saving}
                onChange={(e) => update({ assignedTo: Number(e.target.value) }, 'Assignee')}
                style={{ maxWidth: 260 }}
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                ))}
              </select>
            ) : (
              inquiry.assignedTo.name
            )}
          </dd>
        </dl>
        <PriorityBadge priority={inquiry.priority} />
      </div>
    </>
  )
}
