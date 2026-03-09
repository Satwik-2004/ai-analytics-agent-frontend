'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Send,
  User,
  Bot,
  Loader2,
  LayoutList,
  X,
  Filter,
  Copy,
  Check,
  BarChart2,
  Table as TableIcon,
  Info,
  Trash2,
  Sparkles,
  Download,
  ChevronRight,
  Zap,
  TrendingUp,
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

interface AIResponse {
  status: string
  summary: string
  charts?: any[]
  raw_data: any[]
  insight: string | null
  state?: Record<string, any>
  suggested_actions?: string[]
}

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  data?: AIResponse
  showChart?: boolean
}

const downloadCSV = (data: any[], filename = 'export.csv') => {
  if (!data || data.length === 0) return
  const headers = Object.keys(data[0])
  const csvRows = data.map((row) =>
    headers
      .map((f) => `"${(row[f] ?? '').toString().replace(/"/g, '""')}"`)
      .join(','),
  )
  const csv = [headers.join(','), ...csvRows].join('\r\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function ChatDashboard() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchState, setSearchState] = useState<Record<string, any> | null>(
    null,
  )
  const [showInstructions, setShowInstructions] = useState(false)
  const [inputText, setInputText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setInputText('')
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text },
    ])
    setIsLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          turn_count: 0,
          state: searchState,
        }),
      })
      const data = await res.json()
      if (data.state) setSearchState(data.state)
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: data.summary,
          data,
          showChart: false,
        },
      ])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          role: 'ai',
          content: 'Network Error: Failed to connect to the backend server.',
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSend(inputText)
  }

  const toggleChart = (id: string) =>
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, showChart: !m.showChart } : m)),
    )

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const removeFilter = (key: string, defaultValue: any = null) =>
    setSearchState((prev) => (prev ? { ...prev, [key]: defaultValue } : null))

  const clearChat = () => {
    setMessages([])
    setSearchState(null)
  }

  const hasActiveFilters =
    searchState &&
    Object.values(searchState).some(
      (v) => v !== null && v !== 'corporate_tickets' && v !== 'detail',
    )

  const activeFilterChips = searchState
    ? [
        searchState.domain === 'ppm_tickets'
          ? {
              key: 'domain',
              label: 'Domain',
              value: 'PPM',
              color: 'purple',
              defaultValue: 'corporate_tickets',
            }
          : null,
        searchState.company_name
          ? {
              key: 'company_name',
              label: 'Company',
              value: searchState.company_name,
              color: 'blue',
            }
          : null,
        searchState.branch_name
          ? {
              key: 'branch_name',
              label: 'Branch',
              value: searchState.branch_name,
              color: 'blue',
            }
          : null,
        searchState.timeframe
          ? {
              key: 'timeframe',
              label: 'Time',
              value: searchState.timeframe,
              color: 'blue',
            }
          : null,
        searchState.status
          ? {
              key: 'status',
              label: 'Status',
              value: searchState.status,
              color: 'blue',
            }
          : null,
        searchState.priority
          ? {
              key: 'priority',
              label: 'Priority',
              value: searchState.priority,
              color: 'blue',
            }
          : null,
      ].filter(Boolean)
    : []

  const COLORS = [
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ef4444',
    '#8b5cf6',
    '#ec4899',
    '#06b6d4',
    '#64748b',
  ]

  const tooltipStyle = {
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    fontSize: 13,
    color: '#1e293b',
  }

  const renderChart = (data: any[]) => {
    if (!data || data.length === 0) return null
    const keys = Object.keys(data[0])
    if (keys.length < 2) return null
    const xKey = keys[0],
      yKey = keys[1]
    const isTime = ['TimePeriod', 'CreatedDate', 'PPMDate'].includes(xKey)
    const isDist = ['Status', 'CurrentStatus', 'Priority', 'Type'].includes(
      xKey,
    )
    const h = isTime ? 300 : isDist ? 340 : 320

    return (
      <div
        style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <div
          style={{
            padding: '9px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: '#f1f5f9',
          }}
        >
          <TrendingUp size={12} color='#3b82f6' />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            {data.length} items ·{' '}
            {isTime ? 'Trend' : isDist ? 'Distribution' : 'Comparison'}
          </span>
        </div>
        <div style={{ padding: 16, height: h, overflowX: 'auto' }}>
          <div
            style={{
              minWidth:
                isTime || isDist ? '100%' : Math.max(100, data.length * 50),
              width: '100%',
              height: '100%',
            }}
          >
            <ResponsiveContainer width='100%' height='100%'>
              {isTime ? (
                <LineChart
                  data={data}
                  margin={{ top: 10, right: 16, left: -20, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#f1f5f9'
                  />
                  <XAxis
                    dataKey={xKey}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    dy={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                    contentStyle={tooltipStyle}
                  />
                  <Line
                    type='monotone'
                    dataKey={yKey}
                    stroke='#3b82f6'
                    strokeWidth={2.5}
                    dot={{
                      r: 3.5,
                      fill: '#3b82f6',
                      strokeWidth: 2,
                      stroke: '#fff',
                    }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              ) : isDist ? (
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <Pie
                    data={data}
                    cx='50%'
                    cy='43%'
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey={yKey}
                    nameKey={xKey}
                    stroke='none'
                  >
                    {data.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Legend
                    verticalAlign='bottom'
                    height={36}
                    iconType='circle'
                    wrapperStyle={{
                      fontSize: 12,
                      color: '#64748b',
                      paddingTop: 16,
                    }}
                  />
                </PieChart>
              ) : (
                <BarChart
                  data={data}
                  margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#f1f5f9'
                  />
                  <XAxis
                    dataKey={xKey}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={50}
                    tick={(p) => {
                      const label =
                        p.payload.value.length > 14
                          ? p.payload.value.substring(0, 14) + '…'
                          : p.payload.value
                      const px = Number(p.x),
                        py = Number(p.y)
                      return (
                        <text
                          x={px}
                          y={py + 10}
                          textAnchor='end'
                          fill='#94a3b8'
                          fontSize={11}
                          transform={`rotate(-40,${px},${py + 10})`}
                        >
                          {label}
                        </text>
                      )
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={tooltipStyle}
                  />
                  <Bar
                    dataKey={yKey}
                    fill='#3b82f6'
                    radius={[5, 5, 0, 0]}
                    barSize={30}
                  />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return null
    if (data.length === 1 && Object.keys(data[0]).length === 1) {
      return (
        <div
          style={{
            marginTop: 8,
            padding: '14px 18px',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: 12,
            color: '#1d4ed8',
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: '-0.02em',
          }}
        >
          {String(Object.values(data[0])[0])}
        </div>
      )
    }
    const headers = Object.keys(data[0])
    return (
      <div
        style={{
          marginTop: 8,
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: 14,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            padding: '9px 14px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            background: '#f8fafc',
          }}
        >
          <LayoutList size={12} color='#3b82f6' />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#64748b',
              textTransform: 'uppercase',
              letterSpacing: '0.07em',
            }}
          >
            {data.length} rows
          </span>
        </div>
        <div style={{ overflowX: 'auto', maxHeight: 320 }}>
          <Table>
            <TableHeader>
              <TableRow style={{ borderColor: '#f1f5f9' }}>
                {headers.map((h) => (
                  <TableHead
                    key={h}
                    style={{
                      color: '#475569',
                      fontSize: 12,
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      padding: '9px 14px',
                      position: 'sticky',
                      top: 0,
                      background: '#f8fafc',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    {h}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow
                  key={i}
                  style={{ borderColor: '#f8fafc' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      '#f8fafc')
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      'transparent')
                  }
                >
                  {headers.map((h, j) => (
                    <TableCell
                      key={j}
                      style={{
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#475569',
                        fontSize: 13,
                        padding: '9px 14px',
                      }}
                    >
                      {row[h] !== null && row[h] !== '' ? (
                        String(row[h])
                      ) : (
                        <span style={{ color: '#cbd5e1' }}>—</span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    )
  }

  const SAMPLE_QUERIES = [
    { text: 'Breakdown of corporate tickets by company', icon: '📊' },
    { text: 'PPM ticket status across companies in Jan 2026', icon: '🗓️' },
    { text: 'Total closed tickets in Dec 2025', icon: '✅' },
    { text: 'PPM tickets of Bangalore in 2025', icon: '📍' },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .txai-root {
          font-family: 'Inter', -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          height: 100vh;
          overflow: hidden;
          background: #f1f5f9;
        }

        .txai-header {
          z-index: 20;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          height: 56px;
          background: #ffffff;
          border-bottom: 1px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
        }

        .txai-main {
          flex: 1;
          overflow-y: auto;
          scroll-behavior: smooth;
        }
        .txai-main::-webkit-scrollbar { width: 5px; }
        .txai-main::-webkit-scrollbar-track { background: transparent; }
        .txai-main::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 99px; }

        .txai-footer {
          z-index: 20;
          flex-shrink: 0;
          padding: 10px 16px 14px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          box-shadow: 0 -1px 3px rgba(0,0,0,0.04);
        }

        /* Buttons */
        .btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 9px;
          font-size: 13px; font-weight: 500; cursor: pointer;
          transition: all 0.13s ease; font-family: 'Inter', sans-serif;
          border: 1px solid;
        }
        .btn-ghost {
          background: transparent;
          border-color: #e2e8f0;
          color: #64748b;
        }
        .btn-ghost:hover { background: #f8fafc; color: #334155; border-color: #cbd5e1; }
        .btn-ghost.danger:hover { background: #fef2f2; color: #dc2626; border-color: #fecaca; }
        .btn-primary {
          background: #eff6ff;
          border-color: #bfdbfe;
          color: #2563eb;
        }
        .btn-primary:hover { background: #dbeafe; border-color: #93c5fd; }

        /* Sample cards */
        .sample-card {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 12px; padding: 13px 15px;
          cursor: pointer; display: flex; align-items: flex-start;
          gap: 10px; text-align: left;
          transition: all 0.13s ease; font-family: 'Inter', sans-serif;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }
        .sample-card:hover {
          border-color: #93c5fd;
          background: #f0f7ff;
          box-shadow: 0 2px 8px rgba(59,130,246,0.1);
          transform: translateY(-1px);
        }

        /* Chat bubbles */
        .bubble-user {
          padding: 11px 15px;
          background: transparent;
          border: 1.5px solid #93c5fd;
          border-radius: 18px;
          border-top-right-radius: 5px;
          color: #1e40af;
          font-size: 14px;
          line-height: 1.6;
          font-weight: 500;
        }
        .bubble-ai {
          padding: 12px 16px;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 18px;
          border-top-left-radius: 5px;
          color: #0f172a;
          font-size: 14px;
          line-height: 1.65;
          max-width: 92%;
        }

        /* Avatars */
        .avatar-user {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: #eff6ff;
          border: 1.5px solid #93c5fd;
          display: flex; align-items: center; justify-content: center;
          color: #2563eb;
        }
        .avatar-ai {
          width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0;
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          display: flex; align-items: center; justify-content: center;
          color: #0284c7;
        }

        /* Inline icon buttons on bubbles */
        .icon-btn {
          padding: 5px; border-radius: 7px; background: transparent;
          border: none; cursor: pointer; transition: all 0.12s;
          display: flex; align-items: center; justify-content: center;
          opacity: 0;
          color: #94a3b8;
        }
        .msg-row:hover .icon-btn { opacity: 1; }
        .icon-btn:hover { background: #f1f5f9; color: #475569; }

        /* Input */
        .txai-input {
          width: 100%; border-radius: 14px;
          padding: 13px 50px 13px 16px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          color: #1e293b;
          font-size: 15px; font-family: 'Inter', sans-serif;
          outline: none; transition: all 0.13s ease;
        }
        .txai-input::placeholder { color: #94a3b8; }
        .txai-input:focus {
          border-color: #93c5fd;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.07);
        }
        .txai-input:disabled { opacity: 0.5; }

        .send-btn {
          position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
          width: 36px; height: 36px; border-radius: 11px; border: none;
          background: #2563eb;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: white;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
          transition: all 0.13s ease;
        }
        .send-btn:hover { background: #1d4ed8; box-shadow: 0 4px 12px rgba(37,99,235,0.4); }
        .send-btn:active { transform: translateY(-50%) scale(0.95); }
        .send-btn:disabled {
          background: #e2e8f0; box-shadow: none;
          color: #94a3b8; cursor: not-allowed;
        }

        /* Action pills */
        .action-pill {
          font-size: 12px; font-weight: 600; padding: 5px 13px;
          border-radius: 99px;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          color: #2563eb;
          cursor: pointer; transition: all 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .action-pill:hover { background: #dbeafe; border-color: #93c5fd; }

        /* Data buttons */
        .data-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 5px 11px; border-radius: 8px;
          font-size: 12px; font-weight: 600;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #64748b;
          cursor: pointer; transition: all 0.12s;
          font-family: 'Inter', sans-serif;
        }
        .data-btn:hover { background: #f1f5f9; color: #334155; border-color: #cbd5e1; }
        .data-btn.csv:hover { background: #f0fdf4; color: #16a34a; border-color: #86efac; }

        /* Filter chips */
        .filter-chip {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 3px 9px 3px 10px; border-radius: 99px;
          font-size: 12px; font-weight: 600; border: 1px solid;
        }

        /* Badge */
        .badge-cap {
          display: inline-block; font-size: 11px; font-weight: 600;
          padding: 3px 10px; border-radius: 99px;
          background: #ffffff; border: 1px solid #e2e8f0;
          color: #64748b;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        /* Loader dots */
        .pulse-dot {
          width: 6px; height: 6px; background: #93c5fd;
          border-radius: 99px;
          animation: pdot 1.2s ease-in-out infinite;
        }
        @keyframes pdot {
          0%,80%,100% { transform: translateY(0); opacity: 0.5; }
          40% { transform: translateY(-5px); opacity: 1; }
        }

        /* Fade up */
        .fade-up { animation: fu 0.22s ease forwards; }
        @keyframes fu {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* Modal */
        .modal-overlay {
          position: fixed; inset: 0; z-index: 50;
          display: flex; align-items: center; justify-content: center; padding: 16px;
          background: rgba(15,23,42,0.35);
          backdrop-filter: blur(6px);
        }
        .modal-box {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 20px; width: 100%; max-width: 480px; overflow: hidden;
          box-shadow: 0 24px 60px rgba(0,0,0,0.12);
          animation: fu 0.18s ease;
        }
        .modal-scroll::-webkit-scrollbar { width: 4px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 99px; }

        /* Logo */
        .logo-mark {
          width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, #3b82f6, #6366f1);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 2px 8px rgba(99,102,241,0.3);
        }

        /* Empty state icon */
        .empty-icon {
          width: 60px; height: 60px; border-radius: 18px; margin: 0 auto 18px;
          background: #eff6ff; border: 1px solid #bfdbfe;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }
      `}</style>

      <div className='txai-root'>
        {/* ── HEADER ── */}
        <header className='txai-header'>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className='logo-mark'>
              <Zap size={16} color='white' fill='white' />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#0f172a',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                }}
              >
                TechxAI
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 500 }}>
                Enterprise Search Engine
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {messages.length > 0 && (
              <button className='btn btn-ghost danger' onClick={clearChat}>
                <Trash2 size={13} /> Clear
              </button>
            )}
            <button
              className='btn btn-primary'
              onClick={() => setShowInstructions(true)}
            >
              <Info size={13} /> How to Use
            </button>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main className='txai-main'>
          <div
            style={{
              maxWidth: 820,
              margin: '0 auto',
              padding: '28px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
            }}
          >
            {/* Empty state */}
            {messages.length === 0 && (
              <div className='fade-up' style={{ marginTop: 8 }}>
                <div style={{ textAlign: 'center', marginBottom: 28 }}>
                  <div className='empty-icon'>
                    <BarChart2 size={26} color='#3b82f6' />
                    <div
                      style={{
                        position: 'absolute',
                        top: -6,
                        right: -6,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                        border: '2px solid white',
                      }}
                    >
                      <Sparkles size={10} color='white' />
                    </div>
                  </div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 8,
                      letterSpacing: '-0.03em',
                    }}
                  >
                    AI Data Assistant
                  </h2>
                  <p
                    style={{
                      fontSize: 14,
                      color: '#64748b',
                      maxWidth: 340,
                      margin: '0 auto',
                      lineHeight: 1.6,
                    }}
                  >
                    Ask questions about your Corporate or PPM tickets.
                    Summarize, filter, visualize — all in plain English.
                  </p>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2,1fr)',
                    gap: 9,
                    maxWidth: 640,
                    margin: '0 auto 24px',
                  }}
                >
                  {SAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      className='sample-card'
                      onClick={() => handleSend(q.text)}
                    >
                      <span
                        style={{ fontSize: 17, lineHeight: 1, flexShrink: 0 }}
                      >
                        {q.icon}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#475569',
                          lineHeight: 1.45,
                          flex: 1,
                        }}
                      >
                        {q.text}
                      </span>
                      <ChevronRight
                        size={13}
                        color='#93c5fd'
                        style={{ flexShrink: 0, marginTop: 1 }}
                      />
                    </button>
                  ))}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 7,
                  }}
                >
                  {[
                    'Corporate Tickets',
                    'PPM Tickets',
                    'Charts & Trends',
                    'Export CSV',
                    'Smart Filters',
                  ].map((b) => (
                    <span key={b} className='badge-cap'>
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className='fade-up msg-row'
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  /* FIX: align-items start so avatar sits flush with top of bubble */
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                {/* Avatar — no extra margin top so it lines up with bubble top */}
                <div
                  className={msg.role === 'user' ? 'avatar-user' : 'avatar-ai'}
                >
                  {msg.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 7,
                    minWidth: 0,
                    flex: 1,
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: msg.role === 'user' ? '76%' : '94%',
                  }}
                >
                  {/* Bubble + action icons */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 5,
                    }}
                  >
                    <div
                      className={
                        msg.role === 'user' ? 'bubble-user' : 'bubble-ai'
                      }
                    >
                      {msg.content}
                    </div>

                    {/* Copy button — shown for BOTH user and AI bubbles */}
                    <button
                      className='icon-btn'
                      title='Copy message'
                      onClick={() => copyText(msg.id, msg.content)}
                      style={{ marginTop: 4 }}
                    >
                      {copiedId === msg.id ? (
                        <Check size={13} color='#22c55e' />
                      ) : (
                        <Copy size={13} />
                      )}
                    </button>
                  </div>

                  {/* Suggested action pills */}
                  {msg.role === 'ai' &&
                    msg.data &&
                    msg.data.suggested_actions &&
                    msg.data.suggested_actions.length > 0 &&
                    index === messages.length - 1 && (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                      >
                        {msg.data.suggested_actions.map(
                          (a: string, i: number) => (
                            <button
                              key={i}
                              className='action-pill'
                              onClick={() => handleSend(a)}
                            >
                              {a}
                            </button>
                          ),
                        )}
                      </div>
                    )}

                  {/* Data panel */}
                  {msg.data && msg.data.raw_data.length > 0 && (
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 7,
                          marginBottom: 7,
                        }}
                      >
                        <button
                          className='data-btn csv'
                          onClick={() =>
                            downloadCSV(
                              msg.data!.raw_data,
                              `techxai-${Date.now()}.csv`,
                            )
                          }
                        >
                          <Download size={12} /> Export CSV
                        </button>
                        {msg.data.state?.intent === 'summary' &&
                          msg.data.raw_data.length <= 50 && (
                            <button
                              className='data-btn'
                              onClick={() => toggleChart(msg.id)}
                            >
                              {msg.showChart ? (
                                <>
                                  <TableIcon size={12} /> Table
                                </>
                              ) : (
                                <>
                                  <BarChart2 size={12} /> Visualize
                                </>
                              )}
                            </button>
                          )}
                      </div>
                      {msg.showChart
                        ? renderChart(msg.data.raw_data)
                        : renderTable(msg.data.raw_data)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div
                className='fade-up'
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <div className='avatar-ai'>
                  <Bot size={15} />
                </div>
                <div
                  style={{
                    padding: '12px 15px',
                    background: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: 18,
                    borderTopLeftRadius: 5,
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 160, 320].map((d) => (
                    <div
                      key={d}
                      className='pulse-dot'
                      style={{ animationDelay: `${d}ms` }}
                    />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} style={{ height: 16 }} />
          </div>
        </main>

        {/* ── FOOTER ── */}
        <footer className='txai-footer'>
          <div
            style={{
              maxWidth: 820,
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {/* Active filters */}
            {hasActiveFilters && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#94a3b8',
                    textTransform: 'uppercase',
                    letterSpacing: '0.07em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Filter size={10} /> Filters
                </span>
                {activeFilterChips.map((chip: any) => (
                  <span
                    key={chip.key}
                    className='filter-chip'
                    style={
                      chip.color === 'purple'
                        ? {
                            background: '#faf5ff',
                            borderColor: '#d8b4fe',
                            color: '#7c3aed',
                          }
                        : {
                            background: '#eff6ff',
                            borderColor: '#bfdbfe',
                            color: '#2563eb',
                          }
                    }
                  >
                    <span style={{ opacity: 0.6 }}>{chip.label}:</span>
                    {chip.value}
                    <button
                      onClick={() =>
                        removeFilter(chip.key, chip.defaultValue ?? null)
                      }
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '1px 2px',
                        display: 'flex',
                        color: 'inherit',
                        opacity: 0.55,
                        lineHeight: 1,
                      }}
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => setSearchState(null)}
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: '#94a3b8',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    transition: 'color 0.12s',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#dc2626')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = '#94a3b8')
                  }
                >
                  Clear all
                </button>
              </div>
            )}

            {/* Input */}
            <form
              onSubmit={handleSubmit}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <input
                className='txai-input'
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                disabled={isLoading}
                placeholder={
                  hasActiveFilters
                    ? 'Search within current filters...'
                    : 'Ask anything about your tickets...'
                }
              />
              <button
                type='submit'
                className='send-btn'
                disabled={isLoading || !inputText.trim()}
              >
                {isLoading ? (
                  <Loader2 size={15} className='animate-spin' />
                ) : (
                  <Send size={15} />
                )}
              </button>
            </form>

            <p
              style={{
                fontSize: 11,
                textAlign: 'center',
                color: '#cbd5e1',
                fontWeight: 500,
              }}
            >
              AI can make mistakes · Verify critical data against the source
              system
            </p>
          </div>
        </footer>

        {/* ── MODAL ── */}
        {showInstructions && (
          <div
            className='modal-overlay'
            onClick={(e) =>
              e.target === e.currentTarget && setShowInstructions(false)
            }
          >
            <div className='modal-box'>
              <div
                style={{
                  padding: '15px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    fontSize: 15,
                    fontWeight: 700,
                    color: '#0f172a',
                    letterSpacing: '-0.02em',
                  }}
                >
                  <Info size={16} color='#3b82f6' /> How to Use
                </div>
                <button
                  className='btn btn-ghost'
                  style={{ padding: '5px 8px' }}
                  onClick={() => setShowInstructions(false)}
                >
                  <X size={15} />
                </button>
              </div>

              <div
                className='modal-scroll'
                style={{
                  padding: 20,
                  overflowY: 'auto',
                  maxHeight: '60vh',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 20,
                }}
              >
                <section>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 10,
                    }}
                  >
                    Available Data
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 9,
                    }}
                  >
                    {[
                      {
                        title: 'Corporate Tickets',
                        desc: 'AMC, R&M, Supply and all. Default domain.',
                        color: '#2563eb',
                        bg: '#eff6ff',
                        border: '#bfdbfe',
                      },
                      {
                        title: 'PPM Tickets',
                        desc: 'Planned Preventive Maintenance. Say "PPM" to switch.',
                        color: '#7c3aed',
                        bg: '#faf5ff',
                        border: '#ddd6fe',
                      },
                    ].map((item) => (
                      <div
                        key={item.title}
                        style={{
                          padding: 13,
                          borderRadius: 10,
                          background: item.bg,
                          border: `1px solid ${item.border}`,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: item.color,
                            marginBottom: 4,
                          }}
                        >
                          {item.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#64748b',
                            lineHeight: 1.5,
                          }}
                        >
                          {item.desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 10,
                    }}
                  >
                    Tips
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 9 }}
                  >
                    {[
                      ['Specific dates', '"in January 2026" or "last 30 days"'],
                      [
                        'Drill down',
                        '"Show me details for [Company]" — AI remembers context',
                      ],
                      [
                        'Clear filters',
                        'Use the ✕ chips above the input to reset scope',
                      ],
                    ].map(([t, d]) => (
                      <div
                        key={t}
                        style={{
                          display: 'flex',
                          gap: 9,
                          alignItems: 'flex-start',
                        }}
                      >
                        <div
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: '50%',
                            background: '#3b82f6',
                            marginTop: 7,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: '#475569',
                            lineHeight: 1.55,
                          }}
                        >
                          <strong style={{ color: '#1e293b', fontWeight: 600 }}>
                            {t}:
                          </strong>{' '}
                          {d}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94a3b8',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: 8,
                    }}
                  >
                    Privacy
                  </div>
                  <p
                    style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6 }}
                  >
                    Financial, billing, and quotation records are off-limits.
                    The AI cannot answer questions about prices, costs, or
                    vendor payouts.
                  </p>
                </section>
              </div>

              <div
                style={{
                  padding: '13px 20px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: '#fafafa',
                }}
              >
                <button
                  onClick={() => setShowInstructions(false)}
                  style={{
                    padding: '9px 20px',
                    borderRadius: 10,
                    background: '#2563eb',
                    border: 'none',
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                    transition: 'all 0.13s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#1d4ed8')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = '#2563eb')
                  }
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
