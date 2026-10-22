import { Link, useNavigate } from 'react-router-dom'
import { formatDate } from '../format'
import type { Inquiry } from '../types'
import { isOpen, isStale, staleText } from '../urgency'
import { PriorityBadge, StatusBadge } from './Badges'

// Shared by the dashboard and the inquiries page. Whole row opens the inquiry.
export function InquiryTable({ inquiries }: { inquiries: Inquiry[] }) {
  const navigate = useNavigate()

  return (
    <div className="card table-wrap">
      <table>
        <thead>
          <tr>
            <th className="col-id">#</th>
            <th>Customer</th>
            <th>Subject</th>
            <th>Assigned to</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Updated</th>
            <th className="col-chev"></th>
          </tr>
        </thead>
        <tbody>
          {inquiries.map((i) => (
            <tr
              key={i.id}
              className={`row-link ${isOpen(i) ? '' : 'row-resolved'}`}
              onClick={() => navigate(`/inquiries/${i.id}`)}
            >
              <td className="muted">{i.id}</td>
              <td>
                {i.customerName}
                <div className="sub">{i.contact}</div>
              </td>
              <td className="subject">{i.subject}</td>
              <td>{i.assignedTo.name}</td>
              <td><PriorityBadge priority={i.priority} /></td>
              <td><StatusBadge status={i.status} /></td>
              <td>
                {formatDate(i.updatedAt)}
                {isStale(i) && <div className="problem-text">{staleText(i)}</div>}
              </td>
              <td>
                <Link to={`/inquiries/${i.id}`} className="chev" aria-label={`Open inquiry ${i.id}`} onClick={(e) => e.stopPropagation()}>
                  ›
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
