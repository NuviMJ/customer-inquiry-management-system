import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface Props {
  title: string
  crumb?: { label: string; to: string }
  action?: ReactNode
}

// The white strip at the top of every page: breadcrumb on the left, one action on the right
export function PageHeader({ title, crumb, action }: Props) {
  return (
    <header className="topbar">
      <div className="crumb">
        {crumb && (
          <>
            <Link to={crumb.to}>{crumb.label}</Link> ›{' '}
          </>
        )}
        <strong>{title}</strong>
      </div>
      {action}
    </header>
  )
}
