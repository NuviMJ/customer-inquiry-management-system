import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header className="topbar">
        <Link to="/inquiries" className="brand">Inquiries</Link>
        <nav>
          <NavLink to="/inquiries" end>All</NavLink>
          <NavLink to="/inquiries/new">New inquiry</NavLink>
        </nav>
        <div className="topbar-user">
          <span>
            {user?.name} <span className="muted">({user?.role})</span>
          </span>
          <button className="btn btn-ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </>
  )
}
