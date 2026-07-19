import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import API_URL from '../config.js'

function Dashboard() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [newExamName, setNewExamName] = useState('')
  const navigate = useNavigate()
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchSessions()
  }, [])

  async function fetchSessions() {
    try {
      const response = await axios.get(`${API_URL}/api/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      setSessions(response.data)
    } catch (error) {
      console.error('Failed to fetch sessions')
    } finally {
      setLoading(false)
    }
  }

  async function createSession() {
    if (!newExamName.trim()) return
    try {
      await axios.post(`${API_URL}/api/sessions`,
        { exam_name: newExamName },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setNewExamName('')
      fetchSessions()
    } catch (error) {
      console.error('Failed to create session')
    }
  }

  async function endSession(sessionId) {
    try {
      await axios.put(`${API_URL}/api/sessions/${sessionId}/end`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      fetchSessions()
    } catch (error) {
      console.error('Failed to end session')
    }
  }

  async function deleteSession(sessionId) {
    if (!window.confirm('Are you sure you want to delete this session? This cannot be undone.')) return
    try {
      await axios.delete(`${API_URL}/api/sessions/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      fetchSessions()
    } catch (error) {
      console.error('Failed to delete session')
    }
  }

  function copyLink(sessionId) {
    const link = `${window.location.origin}/monitor/${sessionId}`
    navigator.clipboard.writeText(link)
    alert('Link copied to clipboard!')
  }

  function logout() {
    localStorage.removeItem('token')
    navigate('/login')
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">ExamGuard</h1>
            <p className="text-gray-500 mt-1">Instructor Dashboard</p>
          </div>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Session</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <input
              type="text"
              placeholder="Exam name (e.g. CSIS491 Midterm)"
              value={newExamName}
              onChange={(e) => setNewExamName(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2 text-sm"
            />
            <Button onClick={createSession}>Create Session</Button>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {sessions.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No sessions yet. Create one above.
            </p>
          )}
          {sessions.map((session) => (
            <Card key={session.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{session.exam_name}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {new Date(session.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                  {session.status}
                </Badge>
              </CardHeader>
              <CardContent className="flex gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={() => copyLink(session.id)}
                >
                  Copy Student Link
                </Button>
                {session.status === 'active' && (
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/live/${session.id}`)}
                  >
                    Live View
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => navigate(`/session/${session.id}`)}
                >
                  View Report
                </Button>
                {session.status === 'active' && (
                  <Button
                    variant="destructive"
                    onClick={() => endSession(session.id)}
                  >
                    End Session
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteSession(session.id)}
                >
                  Delete
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Dashboard