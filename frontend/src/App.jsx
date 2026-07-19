import { BrowserRouter, Routes, Route } from 'react-router-dom'
import StudentMonitor from './pages/StudentMonitor.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Login from './pages/Login.jsx'
import SessionReport from './pages/SessionReport.jsx'
import LiveView from './pages/LiveView.jsx'
import ProtectedRoute from './ProtectedRoute.jsx'
import Signup from './pages/Signup.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/monitor/:sessionId" element={<StudentMonitor />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/session/:sessionId" element={
          <ProtectedRoute>
            <SessionReport />
          </ProtectedRoute>
        } />
        <Route path="/live/:sessionId" element={
          <ProtectedRoute>
            <LiveView />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App