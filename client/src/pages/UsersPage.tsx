import { useEffect, useState } from 'react'
import { api, ApiError } from '../api'
import { useAuth } from '../AuthContext'
import { PageHeader } from '../components/PageHeader'
import { formatDate } from '../format'
import type { Role, UserSummary } from '../types'

function initials(name: string) {
  return name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
}

// One component serves both manager-only pages: /staff and /managers
export function UsersPage({ role }: { role: Role }) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)

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

  return (
    <>
      <PageHeader title={title} action={<span className="muted" style={{ fontSize: 13 }}>Manager view</span>} />
      <main className="page">
        <div>
          <h1>{title}</h1>
          <div className="sub">
            {isStaff
              ? 'Who is handling what. Counts are inquiries currently assigned to each staff member.'
              : 'Accounts that can see every inquiry and reassign work.'}
          </div>
        </div>

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
