import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { DashboardPage } from './pages/DashboardPage'
import { InquiriesPage } from './pages/InquiriesPage'
import { InquiryDetailPage } from './pages/InquiryDetailPage'
import { LoginPage } from './pages/LoginPage'
import { NewInquiryPage } from './pages/NewInquiryPage'
import { UsersPage } from './pages/UsersPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/inquiries/new" element={<NewInquiryPage />} />
          <Route path="/inquiries/:id" element={<InquiryDetailPage />} />
          <Route path="/staff" element={<UsersPage role="staff" />} />
          <Route path="/managers" element={<UsersPage role="manager" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
