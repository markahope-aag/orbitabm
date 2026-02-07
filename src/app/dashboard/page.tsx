export default function Dashboard() {
  return (
    <div className="p-8 bg-slate-50 min-h-full">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Dashboard</h1>
          <p className="text-slate-600">Welcome to OrbitABM - your ABM campaign intelligence platform</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Campaigns</p>
                <p className="text-2xl font-bold text-navy-900">12</p>
              </div>
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-cyan-500 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Target Companies</p>
                <p className="text-2xl font-bold text-navy-900">1,247</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-orange-500 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Engagement Rate</p>
                <p className="text-2xl font-bold text-navy-900">24.3%</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-emerald-500 rounded"></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Pipeline Value</p>
                <p className="text-2xl font-bold text-navy-900">$2.4M</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <div className="w-6 h-6 bg-amber-500 rounded"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Coming Soon Section */}
        <div className="bg-white rounded-lg p-8 shadow-sm border border-slate-200">
          <div className="text-center">
            <div className="w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-cyan-500 rounded-full"></div>
            </div>
            <h3 className="text-lg font-semibold text-navy-900 mb-2">Dashboard Coming Soon</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              We&apos;re building powerful analytics and insights for your ABM campaigns. 
              Check back soon for real-time performance metrics and intelligence.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}