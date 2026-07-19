import { useNavigate } from 'react-router-dom'

function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="max-w-2xl mx-auto text-center px-6">

        <div className="mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">ExamGuard</h1>
          <p className="text-xl text-gray-400">
            AI-powered online exam proctoring system
          </p>
          <p className="text-gray-500 mt-3 text-sm">
            Real-time monitoring · Gaze tracking · Object detection · Suspicion scoring
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8 mb-6">
          <h2 className="text-white font-semibold text-lg mb-2">For Instructors</h2>
          <p className="text-gray-400 text-sm mb-4">
            Create and manage exam sessions, monitor students live, and review flagged events.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-600 text-white rounded-lg py-3 font-medium hover:bg-blue-700"
          >
            Instructor Login
          </button>
          <p className="text-gray-500 text-xs mt-3">
            Don't have an account?{' '}
            <span
              onClick={() => navigate('/signup')}
              className="text-blue-400 cursor-pointer hover:underline"
            >
              Create one
            </span>
          </p>
        </div>

        <div className="bg-gray-800 rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-2">For Students</h2>
          <p className="text-gray-400 text-sm mb-4">
            Use the monitoring link provided by your instructor to join your exam session.
          </p>
          <p className="text-gray-500 text-xs">
            Your link looks like: <span className="text-gray-300">examguard.com/monitor/123</span>
          </p>
        </div>

        <p className="text-gray-600 text-xs mt-8">
          American University of Kuwait · CSIS491 Capstone Project 2026
        </p>

      </div>
    </div>
  )
}

export default Home