import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import InquiriesPage from '../pages/InquiriesPage'

function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<LoginPage />}
        />

        <Route
          path="/dashboard"
          element={<DashboardPage />}
        />
        <Route
          path="/inquiries"
          element={<InquiriesPage />}
        />
      </Routes>


    </BrowserRouter>
  )
}

export default Router