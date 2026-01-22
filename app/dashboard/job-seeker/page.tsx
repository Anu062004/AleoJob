export default function JobSeekerDashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Job Seeker Dashboard</h1>
          
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Active Applications</h3>
              <p className="text-3xl font-bold text-purple-400">0</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Completed Jobs</h3>
              <p className="text-3xl font-bold text-purple-400">0</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 border border-purple-500/30">
              <h3 className="text-lg font-semibold mb-2">Reputation</h3>
              <p className="text-3xl font-bold text-purple-400">--</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-8 border border-purple-500/30">
            <h2 className="text-2xl font-semibold mb-4">Available Jobs</h2>
            <p className="text-gray-400">No jobs available at the moment.</p>
          </div>
        </div>
      </div>
    </div>
  );
}






