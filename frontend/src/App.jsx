import { useEffect, useMemo, useState } from 'react'
import {
  Activity, ArrowUpRight, BookOpen, CheckCircle2, CircleDot, CloudDownload,
  Cpu, Database, Download, HardDrive, Library, Network, Radio, RefreshCw,
  Search, Signal, Sun, Moon, Wifi, XCircle,
} from 'lucide-react'

const API_URL = 'http://localhost:8080/api'

const initialData = { peers: [], files: [], stats: null }

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem('dccrm-theme')
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function formatBytes(bytes) {
  if (!bytes) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** exponent).toFixed(exponent > 1 ? 1 : 0)} ${units[exponent]}`
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value || 0)
}

function timeSince(timestamp) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  return `${Math.floor(seconds / 60)}m ago`
}

function App() {
  const [data, setData] = useState(initialData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lastUpdated, setLastUpdated] = useState(new Date())
  const [query, setQuery] = useState('')
  const [downloading, setDownloading] = useState('')
  const [activeTab, setActiveTab] = useState('overview')
  const [theme, setTheme] = useState(getInitialTheme)

  useEffect(() => {
    document.documentElement.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f3f6f1' : '#08100e')
    window.localStorage.setItem('dccrm-theme', theme)
  }, [theme])

  async function loadData() {
    try {
      const [peersResponse, filesResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/peers`),
        fetch(`${API_URL}/files`),
        fetch(`${API_URL}/stats`),
      ])
      if (!peersResponse.ok || !filesResponse.ok || !statsResponse.ok) throw new Error('Mesh API returned an error')
      const [peers, files, stats] = await Promise.all([
        peersResponse.json(), filesResponse.json(), statsResponse.json(),
      ])
      setData({ peers: peers.peers, files: files.files, stats })
      setError('')
      setLastUpdated(new Date())
    } catch (requestError) {
      setError('API offline. Start the Go mesh server on port 8080.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 3000)
    return () => clearInterval(interval)
  }, [])

  async function downloadFile(file) {
    setDownloading(file.id)
    try {
      const response = await fetch(`${API_URL}/files/${file.id}/download`)
      if (!response.ok) throw new Error('Download failed')
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${file.name.replaceAll('/', '-')}.txt`
      anchor.click()
      URL.revokeObjectURL(url)
      await loadData()
    } catch {
      setError('Unable to reach the mesh node. Check that the Go API is running.')
    } finally {
      setDownloading('')
    }
  }

  const filteredFiles = useMemo(() => data.files.filter((file) =>
    `${file.name} ${file.description} ${file.type}`.toLowerCase().includes(query.toLowerCase()),
  ), [data.files, query])
  const onlinePeers = data.peers.filter((peer) => peer.status === 'online').length

  return (
    <div className="app-shell" data-theme={theme}>
      <div className="scanline" />
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><Network size={22} strokeWidth={2.5} /></div>
          <div><div className="brand-name">DCCRM</div><div className="brand-subtitle">Campus Content & Resource Mesh</div></div>
        </div>
        <div className="topbar-meta">
          <span className="network-pill"><span className="pulse-dot" /> CAMPUS-LAN / MESH 01</span>
          <span className="sync-time"><RefreshCw size={13} /> synced {timeSince(lastUpdated)}</span>
          <button className="theme-toggle" onClick={() => setTheme((currentTheme) => currentTheme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === 'dark' ? 'LIGHT' : 'DARK'}</span>
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero-row">
          <div>
            <div className="eyebrow"><span className="eyebrow-line" /> DECENTRALIZED RESOURCE LAYER</div>
            <h1>Good content should<br /><em>travel locally.</em></h1>
            <p className="hero-copy">A living view of the campus mesh. Discover nearby nodes, share course resources, and keep the gateway clear.</p>
          </div>
          <div className="hero-status">
            <div className="status-icon"><Radio size={21} /></div>
            <div><span className="status-label">MESH STATUS</span><strong>{error ? 'DEGRADED' : 'OPERATIONAL'}</strong></div>
            <div className="status-wave"><i /><i /><i /><i /><i /></div>
          </div>
        </section>

        {error && <div className="error-banner"><XCircle size={16} /> {error}<button onClick={loadData}><RefreshCw size={14} /> Retry</button></div>}

        <section className="stats-grid">
          <StatCard icon={<ArrowUpRight />} label="External Gateway Hits Avoided" value={formatNumber(data.stats?.gatewayHitsAvoided)} detail="requests served from local peers" accent="lime" />
          <StatCard icon={<Database />} label="Data Transferred Locally" value={formatBytes(data.stats?.totalBytesTransferred)} detail="content never left campus" accent="cyan" />
          <StatCard icon={<Wifi />} label="Active Campus Peers" value={data.stats?.activePeers || onlinePeers} detail="nodes visible on subnet" accent="orange" />
          <StatCard icon={<Library />} label="Resources Available" value={data.stats?.catalogFiles || data.files.length} detail="files in local catalog" accent="violet" />
        </section>

        <div className="content-tabs" role="tablist">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}><Activity size={16} /> Network overview</button>
          <button className={activeTab === 'catalog' ? 'active' : ''} onClick={() => setActiveTab('catalog')}><BookOpen size={16} /> Resource catalog <span>{data.files.length}</span></button>
        </div>

        <div className="content-grid">
          <section className={`panel peers-panel ${activeTab === 'catalog' ? 'muted-panel' : ''}`}>
            <PanelHeading icon={<Radio />} eyebrow="DISCOVERY / SUBNET 10.24.8.0/24" title="Active Campus Peers" meta={`${onlinePeers} online`} />
            <div className="peer-list">
              {data.peers.map((peer, index) => <PeerRow key={peer.nodeId} peer={peer} index={index} />)}
            </div>
            <div className="panel-footer"><span><span className="legend-dot online" /> online <span className="legend-dot syncing" /> syncing <span className="legend-dot idle" /> idle</span><span className="foot-mono">AUTO-DISCOVERY // 3s</span></div>
          </section>

          <section className={`panel catalog-panel ${activeTab === 'overview' ? '' : 'focused-panel'}`}>
            <PanelHeading icon={<Library />} eyebrow="LOCAL INDEX / REPLICATED CONTENT" title="Mesh File Catalog" meta={<span className="capacity"><HardDrive size={14} /> 78% CACHE HEALTH</span>} />
            <div className="catalog-toolbar"><div className="search-box"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search resources..." /></div><span className="sort-label">SORT: RECENT <span>↕</span></span></div>
            <div className="file-list">
              {loading && <div className="empty-state">Connecting to mesh index...</div>}
              {!loading && filteredFiles.length === 0 && <div className="empty-state">No resources match this query.</div>}
              {filteredFiles.map((file) => <FileRow key={file.id} file={file} downloading={downloading === file.id} onDownload={() => downloadFile(file)} />)}
            </div>
            <div className="panel-footer"><span><CloudDownload size={14} /> Local-first delivery enabled</span><span className="foot-mono">{filteredFiles.length} / {data.files.length} SHOWN</span></div>
          </section>
        </div>

        <footer className="footer"><span><Cpu size={14} /> DCCRM NODE CONSOLE <b>v0.1.0</b></span><span>Built for resilient campus knowledge exchange <span className="footer-mark">◆</span></span></footer>
      </main>
    </div>
  )
}

function StatCard({ icon, label, value, detail, accent }) {
  return <article className={`stat-card ${accent}`}><div className="stat-top"><span className="stat-icon">{icon}</span><span className="stat-tag">LIVE</span></div><div className="stat-value">{value}</div><div className="stat-label">{label}</div><div className="stat-detail"><span className="trend-up">↗</span> {detail}</div></article>
}

function PanelHeading({ icon, eyebrow, title, meta }) {
  return <div className="panel-heading"><div className="panel-title-icon">{icon}</div><div><div className="panel-eyebrow">{eyebrow}</div><h2>{title}</h2></div><div className="panel-heading-meta">{meta}</div></div>
}

function PeerRow({ peer, index }) {
  const stateIcon = peer.status === 'online' ? <CheckCircle2 size={16} /> : peer.status === 'syncing' ? <RefreshCw size={16} /> : <CircleDot size={16} />
  return <div className="peer-row" style={{ '--row-delay': `${index * 70}ms` }}><div className={`peer-status ${peer.status}`}>{stateIcon}</div><div className="peer-identity"><strong>{peer.nodeId}</strong><span>{peer.ip}:{peer.port} <i>·</i> {peer.role}</span></div><div className="signal"><Signal size={15} /><span>{peer.signal}%</span></div><div className="peer-seen">{timeSince(peer.lastSeen)}</div><div className={`status-text ${peer.status}`}>{peer.status}</div></div>
}

function FileRow({ file, downloading, onDownload }) {
  return <div className="file-row"><div className={`file-type ${file.type.toLowerCase()}`}>{file.type}</div><div className="file-identity"><strong>{file.name}</strong><span>{file.description}</span></div><div className="file-meta"><strong>{formatBytes(file.sizeBytes)}</strong><span>{file.chunkCount} chunks <i>·</i> {file.seeders} seeders</span></div><button className="download-button" onClick={onDownload} disabled={downloading} title={`Download ${file.name}`}><Download size={16} />{downloading ? '...' : 'GET'}</button></div>
}

export default App
