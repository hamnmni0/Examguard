import axios from 'axios'
import { useParams } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import API_URL from '../config.js'

function StudentMonitor() {
  const { sessionId } = useParams()
  const videoRef = useRef(null)
  const socketRef = useRef(null)
  const intervalRef = useRef(null)
  const [cameraStatus, setCameraStatus] = useState('idle')
  const [studentId, setStudentId] = useState('')
  const [sessionDbId, setSessionDbId] = useState(null)

  async function startCamera() {
    setCameraStatus('requesting')
    try {
      const response = await axios.post(
        `${API_URL}/api/sessions/${sessionId}/join`,
        { student_identifier: studentId }
      )
      setSessionDbId(response.data.student_session_id)
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      videoRef.current.srcObject = stream
      setCameraStatus('active')
      startStreaming(response.data.student_session_id)
    } catch (error) {
      setCameraStatus('denied')
    }
  }

 function startStreaming(studentSessionId) {
    socketRef.current = io(API_URL)

    socketRef.current.on('connect', () => {
      console.log('Connected to backend')
      socketRef.current.emit('join_session', {
        session_id: parseInt(sessionId),
        student_name: studentId,
        student_session_id: studentSessionId
      })
    })

    socketRef.current.on('flag', (data) => {
      console.log('Flagged event:', data)
    })

    // AI detection frames every 2 seconds
    intervalRef.current = setInterval(() => {
      if (!videoRef.current) return
      const canvas = document.createElement('canvas')
      canvas.width = videoRef.current.videoWidth
      canvas.height = videoRef.current.videoHeight
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0)
      const frame = canvas.toDataURL('image/jpeg', 0.7)
      socketRef.current.emit('frame', {
        frame,
        student_session_id: studentSessionId,
        session_id: parseInt(sessionId)
      })
    }, 2000)

    // Thumbnail updates every 500ms for smoother live view
    const thumbnailInterval = setInterval(() => {
      if (!videoRef.current || !socketRef.current) return
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240
      canvas.getContext('2d').drawImage(videoRef.current, 0, 0, 320, 240)
      const thumbnail = canvas.toDataURL('image/jpeg', 0.4)
      socketRef.current.emit('thumbnail', {
        thumbnail,
        student_session_id: studentSessionId,
        session_id: parseInt(sessionId)
      })
    }, 500)

    socketRef.thumbnailInterval = thumbnailInterval
  }
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (socketRef.thumbnailInterval) clearInterval(socketRef.thumbnailInterval)
      if (socketRef.current) socketRef.current.disconnect()
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="w-full max-w-2xl mx-auto p-6">

        {cameraStatus === 'idle' && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">ExamGuard</h1>
              <p className="text-gray-500 mt-1">Exam Monitoring System</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <h2 className="font-semibold text-blue-900 mb-2">Before you begin</h2>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your webcam will be monitored throughout the exam</li>
                <li>• No audio is recorded</li>
                <li>• Ensure your face is clearly visible and well lit</li>
                <li>• Do not leave the camera frame during the exam</li>
              </ul>
            </div>

            <input
              type="text"
              placeholder="Enter your Student ID or Full Name"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full border rounded-lg px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />

            <button
              onClick={startCamera}
              disabled={!studentId.trim()}
              className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              I Agree — Start Monitoring
            </button>
          </div>
        )}

        {cameraStatus === 'requesting' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-4xl mb-4">📷</div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Requesting Camera Access</h2>
            <p className="text-gray-500">Please allow camera access in your browser to continue.</p>
          </div>
        )}

        {cameraStatus === 'denied' && (
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="text-4xl mb-4">❌</div>
            <h2 className="text-xl font-semibold text-red-600 mb-2">Camera Access Denied</h2>
            <p className="text-gray-500">You must allow camera access to participate in this exam. Please refresh and try again.</p>
          </div>
        )}

        <div
          style={{ display: cameraStatus === 'active' ? 'block' : 'none' }}
          className="bg-gray-800 rounded-2xl shadow-xl overflow-hidden"
        >
          <div className="bg-gray-700 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-white text-sm font-medium">Monitoring Active</span>
            </div>
            <span className="text-gray-400 text-sm">{studentId}</span>
          </div>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full"
          />
          <div className="bg-gray-700 px-4 py-3">
            <p className="text-gray-400 text-xs text-center">
              Your session is being monitored. Do not leave the camera frame.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default StudentMonitor