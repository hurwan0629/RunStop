import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom'

import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import InquiriesPage from '../pages/InquiriesPage'
import UserPage from '../pages/UserPage'

import AdminRoute from './AdminRoute'
import AdminLayout from '../components/AdminLayout'
import UserDetailPage from '../pages/UserDetailPage'

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route
              path="/dashboard"
              element={<DashboardPage />}
            />

            <Route
              path="/users"
              element={<UserPage />}
            />
            <Route
              path="/users/:userIdx"
              element={<UserDetailPage />}
            />

            <Route
              path="/inquiries"
              element={<InquiriesPage />}
            />
          </Route>
        </Route>

        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default Router