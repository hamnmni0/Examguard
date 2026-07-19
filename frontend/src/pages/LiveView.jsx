import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import API_URL from '../config.js'

function LiveView() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [students, setStudents] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    socketRef.current = io(API_URL)

    socketRef.current.on('connect', () => {
      socketRef.current.emit('professor_watch', {
        session_id: parseInt(sessionId)
      })
    })

    socketRef.current.on('students_updated', (data) => {
      setStudents(data.students)
    })

    socketRef.current.on('thumbnail_update', (data) => {
      setStudents(prev => prev.map(student =>
        student.id === data.student_session_id
          ? { ...student, thumbnail: data.thumbnail }
          : student
      ))
    })

    return () => {
      if (socketRef.current) socketRef.current.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Live Monitor</h1>
            <p className="text-gray-400 text-sm mt-1">Session #{sessionId}</p>
          </div>
          <div className="flex gap-3">
            <Badge className="bg-red-500 text-white animate-pulse">
              ● LIVE
            </Badge>
            <Button
              variant="outline"
              className="text-white border-gray-600"
              onClick={() => navigate('/dashboard')}
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {students.length === 0 && (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">👥</div>
            <p className="text-gray-400 text-lg">Waiting for students to join...</p>
            <p className="text-gray-600 text-sm mt-2">
              Share the monitor link with your students
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {students.map((student) => (
            <Card key={student.id} className="bg-gray-800 border-gray-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm truncate">
                  {student.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {student.thumbnail ? (
                  <img
                    src={student.thumbnail}
                    alt={student.name}
                    className="w-full rounded-b-lg"
                  />
                ) : (
                  <div className="w-full h-32 bg-gray-700 rounded-b-lg flex items-center justify-center">
                    <p className="text-gray-500 text-xs">Connecting...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

      </div>
    </div>
  )
}

export default LiveView