import Link from 'next/link';

export default function RoleSelect() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-8 text-center">Choose Your Role</h1>
          
          <div className="grid md:grid-cols-2 gap-8 mt-12">
            <Link
              href="/login/job-seeker"
              className="block p-8 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-purple-500/30 hover:border-purple-500 text-center"
            >
              <h2 className="text-2xl font-semibold mb-4">Job Seeker</h2>
              <p className="text-gray-400 mb-4">
                Find and apply for jobs. Build your reputation privately.
              </p>
              <p className="text-sm text-purple-400">Cost: 1 Aleo credit</p>
            </Link>

            <Link
              href="/login/job-giver"
              className="block p-8 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors border border-purple-500/30 hover:border-purple-500 text-center"
            >
              <h2 className="text-2xl font-semibold mb-4">Job Giver</h2>
              <p className="text-gray-400 mb-4">
                Post jobs and find talented freelancers.
              </p>
              <p className="text-sm text-purple-400">Cost: 3 Aleo credits</p>
            </Link>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-purple-400 hover:text-purple-300">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}






