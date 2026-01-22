export default function JobDetail({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <a href="/dashboard/job-seeker" className="text-purple-400 hover:text-purple-300 mb-4 inline-block">
            ← Back to Dashboard
          </a>
          
          <div className="bg-gray-800 rounded-lg p-8 border border-purple-500/30 mt-4">
            <h1 className="text-3xl font-bold mb-4">Job Details</h1>
            <p className="text-gray-400">Job ID: {params.id}</p>
            <p className="text-gray-400 mt-4">Job details will be displayed here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}






