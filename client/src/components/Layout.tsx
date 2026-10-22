import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

function navClass({ isActive }: { isActive: boolean }) {
  return isActive ? 'nav active' : 'nav'
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <NavLink to="/" className="brand">
          <img src="/logo.png" alt="" className="brand-logo" />
          Coffee Ninja
        </NavLink>

        <NavLink to="/" end className={navClass}><span className="ico">▦</span>Dashboard</NavLink>
        <NavLink to="/inquiries" end className={navClass}><span className="ico">☰</span>Inquiries</NavLink>
        <NavLink to="/inquiries/new" className={navClass}><span className="ico">＋</span>New inquiry</NavLink>

        {user?.role === 'manager' && (
          <>
            <div className="section">Manager</div>
            <NavLink to="/managers" className={navClass}><span className="ico">★</span>Managers</NavLink>
            <NavLink to="/staff" className={navClass}><span className="ico">⚇</span>Staff</NavLink>
          </>
        )}

        <div className="sidebar-user">
          <span className="avatar">{user ? initials(user.name) : ''}</span>
          <div className="sidebar-user-text">
            <div className="sidebar-user-name">{user?.name}</div>
            <div className="sidebar-user-role">{user?.role}</div>
          </div>
          <button className="signout" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <div className="content">
        <Outlet />
      </div>
    </div>
  )
}
