export default function Leaderboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Leaderboard</h1>
          
          <div className="bg-gray-800 rounded-lg p-8 border border-purple-500/30">
            <h2 className="text-2xl font-semibold mb-6">Top Job Seekers</h2>
            <p className="text-gray-400 mb-6">No rankings available yet.</p>
            
            <h2 className="text-2xl font-semibold mb-6 mt-8">Top Job Givers</h2>
            <p className="text-gray-400">No rankings available yet.</p>
          </div>

          <div className="mt-8 text-center">
            <a href="/" className="text-purple-400 hover:text-purple-300">
              ← Back to Home
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}






