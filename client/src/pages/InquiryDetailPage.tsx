import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { PriorityBadge, StatusBadge, statusIcon } from '../components/Badges'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../format'
import { actionLabel, allowedTransitions } from '../status'
import { STATUSES, type Inquiry, type Priority, type Status, type UserSummary } from '../types'
import { isStale, staleText } from '../urgency'

type Notice = { kind: 'success' | 'warn' | 'error'; text: string } | null

export function InquiryDetailPage() {
  const { id = '' } = useParams()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [inquiry, setInquiry] = useState<Inquiry | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<ApiError | null>(null)
  // Arriving from the New inquiry form shows a saved confirmation
  const [notice, setNotice] = useState<Notice>(
    location.state?.saved ? { kind: 'success', text: `Inquiry #${id} has been saved` } : null,
  )
  const [saving, setSaving] = useState(false)
  const [staff, setStaff] = useState<UserSummary[]>([])

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

  async function claim() {
    if (!inquiry) return
    setSaving(true)
    setNotice(null)
    try {
      const data = await api.claimInquiry(inquiry.id)
      setInquiry(data.inquiry)
      setNotice({ kind: 'success', text: 'You are now handling this inquiry' })
    } catch (err) {
      if (err instanceof ApiError && err.details?.reason === 'CLAIMED') {
        // Someone else got there first: show who and reload
        setNotice({ kind: 'warn', text: `${err.message}. The page has been refreshed.` })
        await load()
      } else {
        setNotice({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not claim this inquiry' })
      }
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!inquiry) return
    if (!window.confirm(`Delete inquiry #${inquiry.id} "${inquiry.subject}"? This cannot be undone.`)) return
    setSaving(true)
    setNotice(null)
    try {
      await api.deleteInquiry(inquiry.id)
      navigate('/inquiries', { state: { deleted: inquiry.id } })
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof ApiError ? err.message : 'Could not delete this inquiry' })
      setSaving(false)
    }
  }

  async function update(input: { priority?: Priority | null; assignedTo?: number | null }, label: string) {
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

  if (loading) {
    return (
      <>
        <PageHeader title={`#${id}`} crumb={{ label: 'Inquiries', to: '/inquiries' }} />
        <p className="muted center">Loading inquiry…</p>
      </>
    )
  }

  if (loadError || !inquiry) {
    const code = loadError?.status
    const title =
      code === 404 ? 'Inquiry not found'
      : code === 403 ? 'You cannot view this inquiry'
      : code === 400 ? 'Invalid inquiry link'
      : 'Something went wrong'
    return (
      <>
        <PageHeader title="Inquiry" crumb={{ label: 'Inquiries', to: '/inquiries' }} />
        <main className="page">
          <div className="card center">
            <h1>{title}</h1>
            <p className="muted">{loadError?.message}</p>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <Link to="/inquiries" className="btn btn-primary">Back to inquiries</Link>
              {code !== 404 && code !== 403 && code !== 400 && <button className="btn" onClick={load}>Retry</button>}
            </div>
          </div>
        </main>
      </>
    )
  }

  const currentIndex = STATUSES.indexOf(inquiry.status)
  const canReassign = user?.role === 'manager'
  const inProgress = inquiry.status === 'In Progress'
  const unassigned = inquiry.assignedTo === null
  // Same rule as the server: only the assignee or a manager can change it
  const canModify = user?.role === 'manager' || inquiry.assignedTo?.id === user?.id

  return (
    <>
      <PageHeader
        title={`#${inquiry.id}`}
        crumb={{ label: 'Inquiries', to: '/inquiries' }}
        action={
          <div className="btn-row">
            <Link to="/inquiries" className="btn">← Back to list</Link>
            {user?.role === 'manager' && (
              <button className="btn-icon" title="Delete inquiry" aria-label="Delete inquiry" disabled={saving} onClick={remove}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                </svg>
              </button>
            )}
          </div>
        }
      />
      <main className="page">
        <div className="page-head">
          <div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Inquiry #{inquiry.id}</div>
            <h1>{inquiry.subject}</h1>
            <div className="muted" style={{ marginTop: 6 }}>
              Last updated by {inquiry.updatedBy.name} on {formatDate(inquiry.updatedAt)}
              {isStale(inquiry) && <> · <span className="problem-text">{staleText(inquiry)}</span></>}
            </div>
          </div>
          <div className="btn-row" style={{ alignItems: 'center' }}>
            <PriorityBadge priority={inquiry.priority} />
            <StatusBadge status={inquiry.status} />
          </div>
        </div>

        {notice && <div className={`alert alert-${notice.kind}`} role="alert">{notice.text}</div>}

        <div className="detail-grid">
          <div className="detail-col">
            <div className="card">
              <h2 className="card-title">Customer</h2>
              <div className="card-body">
                <dl>
                  <dt>Name</dt><dd>{inquiry.customerName}</dd>
                  <dt>Contact</dt><dd>{inquiry.contact}</dd>
                  <dt>Subject</dt><dd>{inquiry.subject}</dd>
                </dl>
              </div>
            </div>
            <div className="card">
              <h2 className="card-title">Description</h2>
              <div className="card-body">
                <p style={{ margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{inquiry.description}</p>
              </div>
            </div>
            <div className="card">
              <h2 className="card-title">Details</h2>
              <div className="card-body">
                <dl>
                  <dt>Recorded by</dt><dd>{inquiry.createdBy.name}</dd>
                  <dt>Recorded on</dt><dd>{formatDate(inquiry.createdAt)}</dd>
                  <dt>Last updated</dt><dd>{inquiry.updatedBy.name} · {formatDate(inquiry.updatedAt)}</dd>
                </dl>
              </div>
            </div>
          </div>

          <div className="detail-col">
            <div className="card">
              <h2 className="card-title">Current status</h2>
              <div className="card-body stack">
                <div className="steps">
                  {STATUSES.map((s, index) => {
                    const state = index < currentIndex ? 'done' : index === currentIndex ? 'current' : ''
                    const last = index === STATUSES.length - 1
                    return (
                      <div key={s} className={`step ${state} ${last ? 'last' : ''}`}>
                        <span className="dot">{index < currentIndex ? '✓' : statusIcon[s]}</span>
                        <span className="name">{s}</span>
                        {!last && <span className="line"></span>}
                      </div>
                    )
                  })}
                </div>
                {canModify ? (
                  <>
                    {allowedTransitions(inquiry.status).map((next) => (
                      <button
                        key={next}
                        className={`btn ${next === 'Resolved' ? 'btn-primary' : ''}`}
                        disabled={saving}
                        onClick={() => changeStatus(next)}
                      >
                        {statusIcon[next]} {inquiry.status === 'Resolved' ? 'Reopen' : actionLabel[next]}
                      </button>
                    ))}
                    <span className="muted" style={{ fontSize: 13 }}>
                      {inquiry.status === 'Resolved'
                        ? 'Reopen if the customer needs more work on this.'
                        : 'A resolved inquiry can be reopened later if more work is needed.'}
                    </span>
                  </>
                ) : (
                  <span className="muted" style={{ fontSize: 13 }}>
                    Claim this inquiry to change its status.
                  </span>
                )}
              </div>
            </div>

            <div className="card">
              <h2 className="card-title">Handling</h2>
              <div className="card-body stack">
                <label>
                  Priority
                  <select
                    value={inquiry.priority ?? ''}
                    disabled={saving || !canModify}
                    onChange={(e) => update({ priority: (e.target.value || null) as Priority | null }, 'Priority')}
                  >
                    <option value="">Not set</option>
                    <option value="High">High</option>
                <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </label>
                <label>
                  Assigned to
                  {canReassign ? (
                    <select
                      value={inquiry.assignedTo?.id ?? ''}
                      disabled={saving || staff.length === 0 || inProgress}
                      onChange={(e) => update({ assignedTo: e.target.value ? Number(e.target.value) : null }, 'Assignee')}
                    >
                      <option value="">Unassigned</option>
                      {staff.length === 0 && inquiry.assignedTo && <option value={inquiry.assignedTo.id}>{inquiry.assignedTo.name}</option>}
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  ) : (
                    <input value={inquiry.assignedTo?.name ?? 'Unassigned'} readOnly />
                  )}
                </label>
                {unassigned && (
                  <button className="btn btn-primary" disabled={saving} onClick={claim}>
                    Claim this inquiry
                  </button>
                )}
                {unassigned && (
                  <span className="muted" style={{ fontSize: 13 }}>Nobody is handling this yet. The first person to claim it gets it.</span>
                )}
                {!canReassign && !unassigned && <span className="muted" style={{ fontSize: 13 }}>Only managers can reassign.</span>}
                {canReassign && inProgress && (
                  <span className="problem-text" style={{ fontSize: 13 }}>
                    Already in progress. It cannot be reassigned until it is resolved.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}
