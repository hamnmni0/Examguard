import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import API_URL from '../config.js'

function SessionReport() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const token = localStorage.getItem('token')

  useEffect(() => {
    fetchSessionDetails()
  }, [])

  async function fetchSessionDetails() {
    try {
      const response = await axios.get(
        API_URL + '/api/sessions/' + sessionId,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      setSession(response.data)
    } catch (error) {
      console.error('Failed to fetch session details')
    } finally {
      setLoading(false)
    }
  }

  function getScoreBadge(score) {
    if (score === null || score === undefined) {
      return <Badge variant="secondary">Pending</Badge>
    }
    if (score >= 70) {
      return <Badge variant="destructive">High Risk - {score}</Badge>
    }
    if (score >= 40) {
      return <Badge className="bg-yellow-500 text-white">Medium Risk - {score}</Badge>
    }
    return <Badge className="bg-green-500 text-white">Low Risk - {score}</Badge>
  }

  function getEventColor(eventType) {
    if (eventType === 'gaze_deviation') return 'text-yellow-600'
    if (eventType === 'phone_detected') return 'text-red-600'
    if (eventType === 'face_absent') return 'text-orange-600'
    if (eventType === 'lip_movement') return 'text-blue-600'
    if (eventType === 'multiple_persons') return 'text-red-800'
    return 'text-gray-600'
  }

  if (loading) {
    return <div className="p-8">Loading...</div>
  }

  if (!session) {
    return <div className="p-8">Session not found.</div>
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{session.exam_name}</h1>
            <p className="text-gray-500 mt-1">
              Created: {new Date(session.created_at).toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3">
            <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
              {session.status}
            </Badge>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>

        <div className="grid gap-6">

          {session.students.length === 0 && (
            <p className="text-gray-500 text-center py-8">
              No students have joined this session yet.
            </p>
          )}

          {session.students.map((student) => (
            <Card key={student.id}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{student.student_identifier}</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    Joined: {new Date(student.joined_at).toLocaleString()}
                    {student.ended_at ? ' - Ended: ' + new Date(student.ended_at).toLocaleString() : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  {student.has_recording && (
                    <a
                      href={API_URL + '/api/sessions/' + session.id + '/recording/' + student.id + '/download?token=' + token}
                      className="bg-blue-600 text-white text-xs px-3 py-1 rounded-lg hover:bg-blue-700"
                      download
                    >
                      Download Recording
                    </a>
                  )}
                  {getScoreBadge(student.suspicion_score)}
                </div>
              </CardHeader>

              <CardContent>
                <h3 className="font-medium text-gray-700 mb-3">
                  Flagged Events ({student.flagged_events ? student.flagged_events.length : 0} total)
                </h3>

                {student.flagged_events && student.flagged_events.length === 0 && (
                  <p className="text-gray-400 text-sm">No flagged events.</p>
                )}

                <div className="space-y-2">
                  {student.flagged_events && student.flagged_events.slice(0, 50).map((event, index) => (
                    <div key={index} className="flex items-center justify-between border-b pb-2">
                      <span className={'text-sm font-medium ' + getEventColor(event.event_type)}>
                        {event.event_type.replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <div className="flex gap-4 text-sm text-gray-500">
                        <span>Confidence: {Math.round(event.confidence * 100)}%</span>
                        <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {student.flagged_events && student.flagged_events.length > 50 && (
                  <p className="text-gray-400 text-sm mt-3">
                    Showing 50 of {student.flagged_events.length} events.
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

        </div>
      </div>
    </div>
  )
}

export default SessionReport
