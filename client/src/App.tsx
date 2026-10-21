import { Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RequireAuth } from './components/RequireAuth'
import { InquiriesPage } from './pages/InquiriesPage'
import { LoginPage } from './pages/LoginPage'
import { NewInquiryPage } from './pages/NewInquiryPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/inquiries" element={<InquiriesPage />} />
          <Route path="/inquiries/new" element={<NewInquiryPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/inquiries" replace />} />
    </Routes>
  )
}
