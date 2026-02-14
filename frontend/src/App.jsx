import { useState, useEffect } from 'react'
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Thermometer,
  Network,
  Zap,
  Clock,
  Server,
  RefreshCw
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || ''

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function formatUptime(bootTime) {
  const now = Date.now() / 1000
  const uptime = now - bootTime
  const days = Math.floor(uptime / 86400)
  const hours = Math.floor((uptime % 86400) / 3600)
  const minutes = Math.floor((uptime % 3600) / 60)
  return `${days}d ${hours}h ${minutes}m`
}

function getTempColor(temp, unit = 'C') {
  const celsius = unit === 'F' ? (temp - 32) * 5/9 : temp
  if (celsius < 50) return 'text-emerald-400'
  if (celsius < 70) return 'text-yellow-400'
  if (celsius < 85) return 'text-orange-400'
  return 'text-red-400'
}

function MetricCard({ icon: Icon, title, value, unit, color, glow = false, subtitle }) {
  return (
    <div className="metric-card group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${color} bg-opacity-20`}>
          <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{title}</div>
      </div>
      <div className={`text-4xl font-bold ${glow ? 'glow-text' : ''} mb-1 ${color.replace('bg-', 'text-').replace('-500', '-400')}`}>
        {value}
        {unit && <span className="text-lg text-gray-500 ml-1">{unit}</span>}
      </div>
      {subtitle && (
        <div className="text-sm text-gray-500">{subtitle}</div>
      )}
    </div>
  )
}

function ProgressBar({ value, max, color = 'bg-primary-500' }) {
  const percent = (value / max) * 100
  return (
    <div className="progress-bar">
      <div
        className={`progress-fill ${color}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

function ProcessTable({ processes, type }) {
  const getColor = (percent) => {
    if (percent < 20) return 'text-emerald-400'
    if (percent < 50) return 'text-yellow-400'
    if (percent < 80) return 'text-orange-400'
    return 'text-red-400'
  }

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Activity className="w-5 h-5 text-primary-400" />
        Top Processes by {type === 'cpu' ? 'CPU' : 'Memory'}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-gray-500 text-sm border-b border-dark-700/50">
              <th className="pb-3 font-medium">PID</th>
              <th className="pb-3 font-medium">Name</th>
              <th className="pb-3 font-medium text-right">CPU %</th>
              <th className="pb-3 font-medium text-right">Memory %</th>
              <th className="pb-3 font-medium text-right">Status</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {processes.map((proc, i) => (
              <tr key={i} className="table-row border-b border-dark-700/30">
                <td className="py-3 text-gray-400">{proc.pid}</td>
                <td className="py-3 font-medium">{proc.name}</td>
                <td className={`py-3 text-right font-medium ${getColor(proc.cpu_percent)}`}>
                  {proc.cpu_percent?.toFixed(1) || '0.0'}%
                </td>
                <td className={`py-3 text-right font-medium ${getColor(proc.memory_percent)}`}>
                  {proc.memory_percent?.toFixed(1) || '0.0'}%
                </td>
                <td className="py-3 text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    proc.status === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
                    proc.status === 'sleeping' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {proc.status || 'N/A'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function GaugeChart({ value, max, label, color, unit = '%' }) {
  const percent = (value / max) * 100
  const circumference = 2 * Math.PI * 45
  const offset = circumference - (percent / 100) * circumference

  const getColor = (p) => {
    if (p < 50) return '#10b981'
    if (p < 75) return '#f59e0b'
    return '#ef4444'
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#1e293b"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke={getColor(percent)}
            strokeWidth="12"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold">{value.toFixed(1)}</span>
          <span className="text-xs text-gray-500">{unit}</span>
        </div>
      </div>
      <span className="text-sm text-gray-400 mt-2">{label}</span>
    </div>
  )
}

function App() {
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/metrics`)
      if (!response.ok) throw new Error('Failed to fetch metrics')
      const data = await response.json()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 2000)
      return () => clearInterval(interval)
    }
  }, [autoRefresh])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-12 h-12 text-primary-500 animate-spin" />
          <p className="text-gray-400">Loading system metrics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
        <div className="glass-card p-8 text-center">
          <Server className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-400 mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={fetchMetrics}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary-500/20 rounded-xl">
                <Activity className="w-8 h-8 text-primary-400" />
              </div>
              System Monitor
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Server className="w-4 h-4" />
              {metrics.system.hostname} · {metrics.system.platform} {metrics.system.release}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Uptime: {formatUptime(metrics.uptime)}</span>
            </div>
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-3 rounded-xl transition-all ${
                autoRefresh
                  ? 'bg-primary-500/20 text-primary-400'
                  : 'bg-dark-700/50 text-gray-500'
              }`}
              title={autoRefresh ? 'Auto-refresh on' : 'Auto-refresh off'}
            >
              <RefreshCw className={`w-5 h-5 ${autoRefresh ? 'animate-spin-slow' : ''}`} />
            </button>
            <button
              onClick={fetchMetrics}
              className="p-3 bg-dark-700/50 hover:bg-dark-700 rounded-xl transition-all"
              title="Refresh now"
            >
              <RefreshCw className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </header>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            icon={Cpu}
            title="CPU Usage"
            value={metrics.cpu.percent.toFixed(1)}
            unit="%"
            color="bg-blue-500"
            glow={metrics.cpu.percent > 80}
            subtitle={`${metrics.cpu.count} cores @ ${metrics.cpu.freq.current?.toFixed(0) || 'N/A'} MHz`}
          />
          <MetricCard
            icon={MemoryStick}
            title="Memory Usage"
            value={metrics.memory.percent.toFixed(1)}
            unit="%"
            color="bg-purple-500"
            glow={metrics.memory.percent > 80}
            subtitle={`${formatBytes(metrics.memory.used)} / ${formatBytes(metrics.memory.total)}`}
          />
          <MetricCard
            icon={Thermometer}
            title="Temperature"
            value={metrics.temperature.current?.toFixed(0) || 'N/A'}
            unit="°C"
            color="bg-orange-500"
            glow={metrics.temperature.current > 70}
            subtitle={metrics.temperature.name || 'Sensor'}
          />
          <MetricCard
            icon={HardDrive}
            title="Disk Usage"
            value={metrics.disk.percent.toFixed(1)}
            unit="%"
            color="bg-emerald-500"
            glow={metrics.disk.percent > 80}
            subtitle={`${formatBytes(metrics.disk.used)} / ${formatBytes(metrics.disk.total)}`}
          />
        </div>

        {/* Gauge Charts Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <GaugeChart value={metrics.cpu.percent} max={100} label="CPU" />
          <GaugeChart value={metrics.memory.percent} max={100} label="Memory" />
          <GaugeChart value={metrics.swap.percent} max={100} label="Swap" />
          <GaugeChart value={metrics.disk.percent} max={100} label="Disk" />
        </div>

        {/* Process Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ProcessTable processes={metrics.processes.top_cpu} type="cpu" />
          <ProcessTable processes={metrics.processes.top_memory} type="memory" />
        </div>

        {/* Additional Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Network className="w-5 h-5 text-primary-400" />
              Network I/O
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Sent</span>
                <span className="text-emerald-400 font-mono">{formatBytes(metrics.network.bytes_sent)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Received</span>
                <span className="text-blue-400 font-mono">{formatBytes(metrics.network.bytes_recv)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Packets Sent</span>
                <span className="text-gray-300 font-mono">{metrics.network.packets_sent.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Packets Received</span>
                <span className="text-gray-300 font-mono">{metrics.network.packets_recv.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary-400" />
              System Info
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Platform</span>
                <span className="text-gray-300">{metrics.system.platform}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Release</span>
                <span className="text-gray-300">{metrics.system.release}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Architecture</span>
                <span className="text-gray-300">{metrics.system.machine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Processes</span>
                <span className="text-gray-300">{metrics.processes.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Server className="w-5 h-5 text-primary-400" />
              CPU Details
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Cores</span>
                <span className="text-gray-300">{metrics.cpu.count}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Current Freq</span>
                <span className="text-gray-300">{metrics.cpu.freq.current?.toFixed(0) || 'N/A'} MHz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Min Freq</span>
                <span className="text-gray-300">{metrics.cpu.freq.min?.toFixed(0) || 'N/A'} MHz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Freq</span>
                <span className="text-gray-300">{metrics.cpu.freq.max?.toFixed(0) || 'N/A'} MHz</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-600 text-sm">
          <p>System Monitor Dashboard · Auto-refresh: {autoRefresh ? 'On (2s)' : 'Off'}</p>
        </footer>
      </div>
    </div>
  )
}

export default App
