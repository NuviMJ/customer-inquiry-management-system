import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../format'
import type { Role, UserSummary } from '../types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

type StaffForm = { name: string; email: string }
const emptyForm: StaffForm = { name: '', email: '' }

// One component serves both manager-only pages: /staff and /managers
export function UsersPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [fieldErrors, setFieldErrors] = useState<Partial<StaffForm>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .listUsers()
      .then((data) => setUsers(data.users.filter((u) => u.role === role)))
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError(0, 'UNKNOWN', 'Could not load users')))
      .finally(() => setLoading(false))
  }, [role])

  const isStaff = role === 'staff'
  const title = isStaff ? 'Staff' : 'Managers'

  function updateField(field: keyof StaffForm, value: string) {
    setForm({ ...form, [field]: value })
    if (fieldErrors[field]) setFieldErrors({ ...fieldErrors, [field]: undefined })
  }

  function closeForm() {
    setShowForm(false)
    setForm(emptyForm)
    setFieldErrors({})
    setFormError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSaved(null)

    // Same rules as the server; this only gives faster feedback
    const errors: Partial<StaffForm> = {}
    if (form.name.trim().length < 2) errors.name = 'Name needs at least 2 characters'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address'
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      return
    }

    setSaving(true)
    try {
      const data = await api.createStaff(form)
      setUsers([...users, data.user].sort((a, b) => a.name.localeCompare(b.name)))
      setSaved(`${data.user.name} has been added. They can sign in with ${data.user.email} and the password password123.`)
      closeForm()
    } catch (err) {
      if (err instanceof ApiError && err.details?.fields) {
        setFieldErrors(err.details.fields)
      } else {
        setFormError(err instanceof ApiError ? err.message : 'Could not add the staff member')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title={title}
        action={
          isStaff ? (
            <button className="btn btn-primary" onClick={() => { setSaved(null); setShowForm(true) }} disabled={showForm}>
              + Add staff member
            </button>
          ) : (
            <span className="muted" style={{ fontSize: 13 }}>Manager view</span>
          )
        }
      />
      <main className="page">
        <div>
          <h1>{title}</h1>
          <div className="sub">
            {isStaff
              ? 'Who is handling what. Counts are inquiries currently assigned to each staff member.'
              : 'Accounts that can see every inquiry and reassign work.'}
          </div>
        </div>

        {saved && <div className="alert alert-success" role="alert">{saved}</div>}

        {showForm && (
          <form onSubmit={handleSubmit} noValidate className="card form-card">
            <h2 className="card-title">New staff member</h2>
            <div className="card-body form">
              <label>
                Full name
                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} className={fieldErrors.name ? 'invalid' : ''} autoFocus />
                {fieldErrors.name && <span className="field-error" role="alert">{fieldErrors.name}</span>}
              </label>
              <label>
                Email
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className={fieldErrors.email ? 'invalid' : ''} />
                {fieldErrors.email && <span className="field-error" role="alert">{fieldErrors.email}</span>}
              </label>
              <span className="muted" style={{ fontSize: 13 }}>New accounts start with the password <strong>password123</strong>.</span>

              {formError && <div className="alert alert-error" role="alert">{formError}</div>}

              <div className="btn-row">
                <button className="btn btn-primary" type="submit" disabled={saving}>
                  {saving ? 'Adding…' : 'Add staff member'}
                </button>
                <button className="btn" type="button" onClick={closeForm} disabled={saving}>Cancel</button>
              </div>
            </div>
          </form>
        )}

        {loading && <p className="muted center">Loading…</p>}

        {!loading && error && (
          <div className="alert alert-error" role="alert">
            {error.status === 403 ? 'Only managers can view this page.' : error.message}
          </div>
        )}

        {!loading && !error && (
          <div className="card table-wrap">
            <table>
              <thead>
                <tr>
                  <th>{isStaff ? 'Staff member' : 'Manager'}</th>
                  <th>Email</th>
                  {isStaff ? (
                    <>
                      <th className="num">New</th>
                      <th className="num">In progress</th>
                      <th className="num">Resolved</th>
                      <th className="num">Total assigned</th>
                    </>
                  ) : (
                    <>
                      <th>Role</th>
                      <th>Member since</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <span className="pill">
                        <span className={`avatar ${isStaff ? '' : 'navy'}`}>{initials(u.name)}</span>
                        {u.name}
                        {u.id === user?.id && <span className="you">You</span>}
                      </span>
                    </td>
                    <td className="muted">{u.email}</td>
                    {isStaff ? (
                      <>
                        <td className="num">{u.newCount ? <span className="badge badge-new">{u.newCount}</span> : <span className="muted">0</span>}</td>
                        <td className="num">{u.inProgressCount ? <span className="badge badge-progress">{u.inProgressCount}</span> : <span className="muted">0</span>}</td>
                        <td className="num">{u.resolvedCount ? <span className="badge badge-resolved">{u.resolvedCount}</span> : <span className="muted">0</span>}</td>
                        <td className="num" style={{ fontWeight: 600 }}>{u.newCount + u.inProgressCount + u.resolvedCount}</td>
                      </>
                    ) : (
                      <>
                        <td><span className="badge badge-new">★ Manager</span></td>
                        <td className="muted">{formatDate(u.createdAt)}</td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="muted center">No {title.toLowerCase()} yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
