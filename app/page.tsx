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
  ArrowUpRight,
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
  Legend,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────────────

// FIX 3: Support both `type` (Python backend) and `chart_type` (legacy)
interface ChartSignal {
  type?: 'line' | 'bar' | 'stacked_bar' | 'pie' | 'kpi' | 'table'
  chart_type?: 'line' | 'bar' | 'stacked_bar' | 'pie' | 'kpi' | 'table'
  x_key?: string
  y_key?: string
  series_key?: string
  title?: string
}
interface AIResponse {
  status: string
  summary: string
  charts?: ChartSignal[]
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

// ── CSV Export ─────────────────────────────────────────────────────────────

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

// ── Component ──────────────────────────────────────────────────────────────

export default function ChatDashboard() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchState, setSearchState] = useState<Record<string, any> | null>(
    null,
  )
  const [showInstructions, setShowInstructions] = useState(false)
  const [inputText, setInputText] = useState('')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [turnCount, setTurnCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = '48px'
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
          turn_count: turnCount,
          state: searchState,
        }),
      })
      const data: AIResponse = await res.json()
      if (data.state) setSearchState(data.state)
      setTurnCount((c) => c + 1)
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

  const dismissPill = (pillText: string) => {
    setSearchState((prev) => {
      const base = prev ?? {}
      const existing: string[] = base.dismissed_pills ?? []
      const n = pillText.toLowerCase().trim()
      if (existing.map((p: string) => p.toLowerCase()).includes(n)) return base
      return { ...base, dismissed_pills: [...existing, n] }
    })
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
    setTurnCount(0)
  }

  const hasActiveFilters =
    searchState &&
    Object.entries(searchState).some(
      ([k, v]) =>
        v !== null &&
        v !== 'corporate_tickets' &&
        v !== 'detail' &&
        k !== 'dismissed_pills' &&
        k !== 'last_updated',
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
              value: Array.isArray(searchState.branch_name)
                ? searchState.branch_name.join(' + ')
                : searchState.branch_name,
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
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '10px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    fontSize: 12,
    color: '#e2e8f0',
  }

  const formatMessage = (text: string) => {
    if (!text) return null
    return text.split('\n').map((line, i) => (
      <div key={i} style={{ minHeight: line.trim() === '' ? 8 : 'auto' }}>
        {line.split(/(\*\*.*?\*\*)/g).map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j} style={{ color: 'inherit', fontWeight: 700 }}>
              {part.slice(2, -2)}
            </strong>
          ) : (
            <span key={j}>{part}</span>
          ),
        )}
      </div>
    ))
  }

  // ── renderChart ───────────────────────────────────────────────────────────

  const renderChart = (data: any[], chartSignal?: ChartSignal) => {
    if (!data || data.length === 0) return null
    const keys = Object.keys(data[0])
    if (keys.length < 2) return renderTable(data)

    // FIX 3: Resolve chart type from either field name (backend uses `type`, legacy uses `chart_type`)
    const actualType = chartSignal?.type || chartSignal?.chart_type

    if (actualType && chartSignal?.x_key && chartSignal?.y_key) {
      const { x_key, y_key, series_key, title } = chartSignal
      let chartData = data
      let barCategories: string[] = [y_key]

      if (actualType === 'stacked_bar' && series_key) {
        const pivotedMap = new Map<string, any>()
        const catSet = new Set<string>()
        data.forEach((item) => {
          const xVal = item[x_key]
          const cat = String(item[series_key] || 'Unknown')
          const val = Number(item[y_key] || 0)
          catSet.add(cat)
          if (!pivotedMap.has(xVal)) pivotedMap.set(xVal, { [x_key]: xVal })
          pivotedMap.get(xVal)![cat] = val
        })
        chartData = Array.from(pivotedMap.values())
        barCategories = Array.from(catSet)
      }

      const isStacked = actualType === 'stacked_bar'
      const h = actualType === 'line' ? 300 : actualType === 'pie' ? 340 : 320
      const label =
        title ??
        (actualType === 'line'
          ? 'Trend'
          : actualType === 'stacked_bar'
            ? 'Stacked Comparison'
            : actualType === 'pie'
              ? 'Distribution'
              : 'Comparison')

      return (
        <div
          style={{
            background: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: 14,
            overflow: 'hidden',
            marginTop: 8,
          }}
        >
          <div
            style={{
              padding: '9px 14px',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              background: '#0f172a',
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
              {isStacked
                ? `${chartData.length} groups`
                : `${data.length} items`}{' '}
              · {label}
            </span>
          </div>
          <div style={{ padding: 16, height: h, overflowX: 'auto' }}>
            <div
              style={{
                minWidth:
                  actualType === 'pie' || actualType === 'line'
                    ? '100%'
                    : Math.max(100, chartData.length * 50),
                width: '100%',
                height: '100%',
              }}
            >
              <ResponsiveContainer width='100%' height='100%'>
                {actualType === 'line' ? (
                  <LineChart
                    data={chartData}
                    margin={{ top: 10, right: 16, left: -20, bottom: 10 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={false}
                      stroke='#1e293b'
                    />
                    <XAxis
                      dataKey={x_key}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                      dy={8}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <RechartsTooltip
                      cursor={{ stroke: '#334155', strokeWidth: 1 }}
                      contentStyle={tooltipStyle}
                    />
                    <Line
                      type='monotone'
                      dataKey={y_key}
                      stroke='#3b82f6'
                      strokeWidth={2.5}
                      dot={{
                        r: 3.5,
                        fill: '#3b82f6',
                        strokeWidth: 2,
                        stroke: '#0f172a',
                      }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </LineChart>
                ) : actualType === 'pie' ? (
                  <PieChart
                    margin={{ top: 10, right: 10, left: 10, bottom: 20 }}
                  >
                    <Pie
                      data={chartData.map((e: any, i: number) => ({
                        ...e,
                        fill: COLORS[i % COLORS.length],
                      }))}
                      cx='50%'
                      cy='43%'
                      innerRadius={70}
                      outerRadius={110}
                      paddingAngle={3}
                      dataKey={y_key}
                      nameKey={x_key}
                      stroke='none'
                    />
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
                    data={chartData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                  >
                    <CartesianGrid
                      strokeDasharray='3 3'
                      vertical={false}
                      stroke='#1e293b'
                    />
                    <XAxis
                      dataKey={x_key}
                      tickLine={false}
                      axisLine={false}
                      interval={0}
                      height={50}
                      tick={(p) => {
                        // FIX 2: Force to string to prevent null.length crash
                        const safeVal = String(p.payload.value ?? 'Unknown')
                        const lbl =
                          safeVal.length > 14
                            ? safeVal.substring(0, 14) + '…'
                            : safeVal
                        const px = Number(p.x),
                          py = Number(p.y)
                        return (
                          <text
                            x={px}
                            y={py + 10}
                            textAnchor='end'
                            fill='#475569'
                            fontSize={11}
                            transform={`rotate(-40,${px},${py + 10})`}
                          >
                            {lbl}
                          </text>
                        )
                      }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: '#475569' }}
                    />
                    <RechartsTooltip
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={tooltipStyle}
                    />
                    {isStacked && (
                      <Legend
                        verticalAlign='top'
                        height={36}
                        iconType='circle'
                        wrapperStyle={{
                          fontSize: 12,
                          color: '#64748b',
                          paddingBottom: 10,
                        }}
                      />
                    )}
                    {barCategories.map((cat, i) => (
                      <Bar
                        key={cat}
                        dataKey={cat}
                        stackId={isStacked ? 'a' : undefined}
                        fill={COLORS[i % COLORS.length]}
                        radius={!isStacked ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                        barSize={30}
                      />
                    ))}
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )
    }

    // Legacy fallback
    const xKey = keys[0]
    const yKey =
      keys.find(
        (k) =>
          k.toLowerCase().includes('count') ||
          k.toLowerCase().includes('total'),
      ) || keys[keys.length - 1]
    const categoryKey = keys.length === 3 ? keys[1] : null
    const isTime = ['TimePeriod', 'CreatedDate', 'PPMDate'].some((v) =>
      xKey.toLowerCase().includes(v.toLowerCase()),
    )
    const isDist = ['Status', 'CurrentStatus', 'Priority', 'Type'].some((v) =>
      xKey.toLowerCase().includes(v.toLowerCase()),
    )
    const isStacked = !!categoryKey
    const h = isTime ? 300 : isDist && !isStacked ? 340 : 320
    let chartData = data
    let barCategories = [yKey]

    if (isStacked && categoryKey) {
      const pivotedMap = new Map<string, any>()
      const catSet = new Set<string>()
      data.forEach((item) => {
        const xVal = item[xKey]
        const catVal = String(item[categoryKey] || 'Unknown')
        const val = Number(item[yKey] || 0)
        catSet.add(catVal)
        if (!pivotedMap.has(xVal)) pivotedMap.set(xVal, { [xKey]: xVal })
        pivotedMap.get(xVal)![catVal] = val
      })
      chartData = Array.from(pivotedMap.values())
      barCategories = Array.from(catSet)
    }

    return (
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 14,
          overflow: 'hidden',
          marginTop: 8,
        }}
      >
        <div
          style={{
            padding: '9px 14px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
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
            {isStacked ? `${chartData.length} groups` : `${data.length} items`}{' '}
            ·{' '}
            {isTime
              ? 'Trend'
              : isStacked
                ? 'Stacked Comparison'
                : isDist
                  ? 'Distribution'
                  : 'Comparison'}
          </span>
        </div>
        <div style={{ padding: 16, height: h, overflowX: 'auto' }}>
          <div
            style={{
              minWidth:
                isTime || isDist
                  ? '100%'
                  : Math.max(100, chartData.length * 50),
              width: '100%',
              height: '100%',
            }}
          >
            <ResponsiveContainer width='100%' height='100%'>
              {isTime ? (
                <LineChart
                  data={chartData}
                  margin={{ top: 10, right: 16, left: -20, bottom: 10 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#1e293b'
                  />
                  <XAxis
                    dataKey={xKey}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#475569' }}
                    dy={8}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <RechartsTooltip
                    cursor={{ stroke: '#334155', strokeWidth: 1 }}
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
                      stroke: '#0f172a',
                    }}
                    activeDot={{ r: 5, strokeWidth: 0 }}
                  />
                </LineChart>
              ) : isDist && !isStacked ? (
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <Pie
                    data={chartData.map((e: any, i: number) => ({
                      ...e,
                      fill: COLORS[i % COLORS.length],
                    }))}
                    cx='50%'
                    cy='43%'
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={3}
                    dataKey={yKey}
                    nameKey={xKey}
                    stroke='none'
                  />
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
                  data={chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 45 }}
                >
                  <CartesianGrid
                    strokeDasharray='3 3'
                    vertical={false}
                    stroke='#1e293b'
                  />
                  <XAxis
                    dataKey={xKey}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    height={50}
                    tick={(p) => {
                      // FIX 2: Force to string to prevent null.length crash
                      const safeVal = String(p.payload.value ?? 'Unknown')
                      const lbl =
                        safeVal.length > 14
                          ? safeVal.substring(0, 14) + '…'
                          : safeVal
                      const px = Number(p.x),
                        py = Number(p.y)
                      return (
                        <text
                          x={px}
                          y={py + 10}
                          textAnchor='end'
                          fill='#475569'
                          fontSize={11}
                          transform={`rotate(-40,${px},${py + 10})`}
                        >
                          {lbl}
                        </text>
                      )
                    }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fontSize: 11, fill: '#475569' }}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                    contentStyle={tooltipStyle}
                  />
                  {isStacked && (
                    <Legend
                      verticalAlign='top'
                      height={36}
                      iconType='circle'
                      wrapperStyle={{
                        fontSize: 12,
                        color: '#64748b',
                        paddingBottom: 10,
                      }}
                    />
                  )}
                  {barCategories.map((cat, i) => (
                    <Bar
                      key={cat}
                      dataKey={cat}
                      stackId={isStacked ? 'a' : undefined}
                      fill={COLORS[i % COLORS.length]}
                      radius={!isStacked ? [5, 5, 0, 0] : [0, 0, 0, 0]}
                      barSize={30}
                    />
                  ))}
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    )
  }

  // ── renderTable ───────────────────────────────────────────────────────────

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return null
    if (data.length === 1 && Object.keys(data[0]).length === 1) {
      return (
        <div
          style={{
            marginTop: 8,
            padding: '16px 20px',
            background: 'rgba(59,130,246,0.08)',
            border: '1px solid rgba(59,130,246,0.2)',
            borderRadius: 12,
            color: '#60a5fa',
            fontWeight: 800,
            fontSize: 28,
            letterSpacing: '-0.03em',
            fontFamily: 'Syne, sans-serif',
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
          background: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '9px 14px',
            borderBottom: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 7,
          }}
        >
          <LayoutList size={12} color='#3b82f6' />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#475569',
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
              <TableRow style={{ borderColor: '#1e293b' }}>
                {headers.map((h) => (
                  <TableHead
                    key={h}
                    style={{
                      color: '#64748b',
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                      padding: '9px 14px',
                      position: 'sticky',
                      top: 0,
                      background: '#0f172a',
                      borderBottom: '1px solid #1e293b',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
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
                  style={{ borderColor: '#1e293b' }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background =
                      '#162032')
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
                        color: '#94a3b8',
                        fontSize: 13,
                        padding: '9px 14px',
                      }}
                    >
                      {row[h] !== null && row[h] !== '' ? (
                        String(row[h])
                      ) : (
                        <span style={{ color: '#334155' }}>—</span>
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
    {
      text: 'Breakdown of corporate tickets by company',
      icon: '📊',
      tag: 'Summary',
    },
    {
      text: 'PPM ticket status across companies in Jan 2026',
      icon: '🗓️',
      tag: 'PPM',
    },
    {
      text: 'Total closed tickets in Dec 2025 company wise',
      icon: '✅',
      tag: 'Corporate',
    },
    {
      text: 'PPM tickets across companies of Bangalore in 2025',
      icon: '📍',
      tag: 'Location',
    },
  ]

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg: #080f1a;
          --surface: #0d1829;
          --surface-2: #111e30;
          --border: #1a2740;
          --border-2: #223050;
          --text: #e2e8f0;
          --text-muted: #64748b;
          --text-dim: #334155;
          --accent: #3b82f6;
          --accent-dim: rgba(59,130,246,0.12);
          --accent-border: rgba(59,130,246,0.25);
          --font-display: 'Syne', sans-serif;
          --font-body: 'DM Sans', sans-serif;
        }

        .txai-root {
          font-family: var(--font-body);
          display: flex; flex-direction: column;
          height: 100vh; overflow: hidden;
          background: var(--bg);
          color: var(--text);
        }

        /* Subtle mesh gradient behind empty state */
        .txai-root::before {
          content: '';
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background:
            radial-gradient(ellipse 60% 40% at 20% 20%, rgba(59,130,246,0.07) 0%, transparent 70%),
            radial-gradient(ellipse 50% 35% at 80% 70%, rgba(99,102,241,0.05) 0%, transparent 70%);
        }

        .txai-header {
          position: relative; z-index: 20; flex-shrink: 0;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 24px; height: 58px;
          background: rgba(8,15,26,0.95);
          border-bottom: 1px solid var(--border);
          backdrop-filter: blur(12px);
        }

        .txai-main { position: relative; z-index: 1; flex: 1; overflow-y: auto; scroll-behavior: smooth; }
        .txai-main::-webkit-scrollbar { width: 4px; }
        .txai-main::-webkit-scrollbar-track { background: transparent; }
        .txai-main::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 99px; }

        .txai-footer {
          position: relative; z-index: 20; flex-shrink: 0;
          padding: 12px 20px 16px;
          background: rgba(8,15,26,0.95);
          border-top: 1px solid var(--border);
          backdrop-filter: blur(12px);
        }

        /* ── Buttons ── */
        .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 9px; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.13s ease; font-family: var(--font-body); border: 1px solid; }
        .btn-ghost { background: transparent; border-color: var(--border-2); color: var(--text-muted); }
        .btn-ghost:hover { background: var(--surface-2); color: var(--text); border-color: #2d4060; }
        .btn-ghost.danger:hover { background: rgba(239,68,68,0.08); color: #f87171; border-color: rgba(239,68,68,0.25); }
        .btn-primary { background: var(--accent-dim); border-color: var(--accent-border); color: #60a5fa; }
        .btn-primary:hover { background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.4); }

        /* ── Sample cards ── */
        .sample-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 14px; padding: 16px 16px 14px;
          cursor: pointer; display: flex; flex-direction: column;
          gap: 10; text-align: left;
          transition: all 0.15s ease; font-family: var(--font-body);
          position: relative; overflow: hidden;
        }
        .sample-card::before {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(ellipse 80% 60% at 0% 0%, rgba(59,130,246,0.05) 0%, transparent 70%);
          opacity: 0; transition: opacity 0.2s;
        }
        .sample-card:hover { border-color: var(--border-2); background: var(--surface-2); transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
        .sample-card:hover::before { opacity: 1; }

        /* ── Chat bubbles ── */
        .bubble-user {
          padding: 11px 16px;
          background: rgba(59,130,246,0.1);
          border: 1px solid rgba(59,130,246,0.2);
          border-radius: 16px; border-top-right-radius: 4px;
          color: #93c5fd; font-size: 14px; line-height: 1.6; font-weight: 500;
        }
        .bubble-ai {
          padding: 13px 17px;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 16px; border-top-left-radius: 4px;
          color: var(--text); font-size: 14px; line-height: 1.7; max-width: 92%;
        }

        /* ── Avatars ── */
        .avatar-user { width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; background: rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.25); display: flex; align-items: center; justify-content: center; color: #60a5fa; }
        .avatar-ai { width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; background: var(--surface-2); border: 1px solid var(--border-2); display: flex; align-items: center; justify-content: center; color: #64748b; }

        /* ── Icon button ── */
        .icon-btn { padding: 5px; border-radius: 7px; background: transparent; border: none; cursor: pointer; transition: all 0.12s; display: flex; align-items: center; justify-content: center; opacity: 0; color: var(--text-dim); }
        .msg-row:hover .icon-btn { opacity: 1; }
        .icon-btn:hover { background: var(--surface-2); color: var(--text-muted); }

        /* ── Input ── */
        .txai-input {
          width: 100%; border-radius: 14px; padding: 14px 52px 14px 18px;
          background: var(--surface); border: 1px solid var(--border-2);
          color: var(--text); font-size: 15px; font-family: var(--font-body);
          outline: none; transition: border-color 0.13s, box-shadow 0.13s; line-height: 1.5;
        }
        .txai-input::placeholder { color: var(--text-dim); }
        .txai-input:focus { border-color: rgba(59,130,246,0.5); box-shadow: 0 0 0 3px rgba(59,130,246,0.08); }
        .txai-input:disabled { opacity: 0.4; }
        .txai-input::-webkit-scrollbar { width: 4px; }
        .txai-input::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 99px; }

        /* ── Send button ── */
        .send-btn { position: absolute; right: 9px; top: 50%; transform: translateY(-50%); width: 36px; height: 36px; border-radius: 10px; border: none; background: var(--accent); display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; box-shadow: 0 2px 12px rgba(59,130,246,0.35); transition: all 0.13s ease; }
        .send-btn:hover { background: #2563eb; box-shadow: 0 4px 16px rgba(59,130,246,0.5); }
        .send-btn:active { transform: translateY(-50%) scale(0.94); }
        .send-btn:disabled { background: var(--surface-2); box-shadow: none; color: var(--text-dim); cursor: not-allowed; }

        /* ── Pills ── */
        .action-pill {
          font-size: 12px; font-weight: 600; padding: 5px 10px 5px 13px; border-radius: 99px;
          background: var(--accent-dim); border: 1px solid var(--accent-border); color: #60a5fa;
          cursor: pointer; transition: all 0.12s; font-family: var(--font-body);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .action-pill:hover { background: rgba(59,130,246,0.18); border-color: rgba(59,130,246,0.4); }
        .pill-x { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 14px; border-radius: 99px; background: rgba(59,130,246,0.15); border: none; cursor: pointer; color: #60a5fa; transition: background 0.12s; flex-shrink: 0; padding: 0; }
        .pill-x:hover { background: rgba(59,130,246,0.3); }

        /* ── Data buttons ── */
        .data-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 8px; font-size: 12px; font-weight: 600; background: var(--surface); border: 1px solid var(--border-2); color: var(--text-muted); cursor: pointer; transition: all 0.12s; font-family: var(--font-body); }
        .data-btn:hover { background: var(--surface-2); color: var(--text); border-color: #2d4060; }
        .data-btn.csv:hover { background: rgba(16,185,129,0.08); color: #34d399; border-color: rgba(16,185,129,0.25); }

        /* ── Filter chips ── */
        .filter-chip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px 3px 11px; border-radius: 99px; font-size: 12px; font-weight: 600; border: 1px solid; }

        /* ── Typing indicator ── */
        .pulse-dot { width: 5px; height: 5px; background: #3b82f6; border-radius: 99px; animation: pdot 1.2s ease-in-out infinite; }
        @keyframes pdot { 0%,80%,100% { transform: translateY(0); opacity: 0.35; } 40% { transform: translateY(-5px); opacity: 1; } }

        /* ── Animations ── */
        .fade-up { animation: fu 0.24s ease forwards; }
        @keyframes fu { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .stagger-1 { animation: fu 0.3s ease 0.05s both; }
        .stagger-2 { animation: fu 0.3s ease 0.12s both; }
        .stagger-3 { animation: fu 0.3s ease 0.19s both; }
        .stagger-4 { animation: fu 0.3s ease 0.26s both; }
        .stagger-5 { animation: fu 0.3s ease 0.33s both; }

        /* ── Logo mark ── */
        .logo-mark { width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; background: var(--accent); display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(59,130,246,0.4); }

        /* ── Modal ── */
        .modal-overlay { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 16px; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); }
        .modal-box { background: #0d1829; border: 1px solid var(--border-2); border-radius: 20px; width: 100%; max-width: 560px; overflow: hidden; box-shadow: 0 32px 80px rgba(0,0,0,0.6); animation: fu 0.2s ease; }
        .modal-scroll::-webkit-scrollbar { width: 4px; }
        .modal-scroll::-webkit-scrollbar-thumb { background: var(--border-2); border-radius: 99px; }

        /* How-to-use extras */
        .htuse-example-row { display: grid; grid-template-columns: 1fr 1fr; border-bottom: 1px solid var(--border); }
        .htuse-tip-bar { padding: 6px 12px; background: rgba(245,158,11,0.04); border-top: 1px solid rgba(245,158,11,0.1); display: flex; align-items: center; gap: 5px; }
        .htuse-filter-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .htuse-step-row { display: flex; align-items: center; gap: 10px; }

        /* capability badges */
        .cap-badge { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 4px 11px; border-radius: 99px; border: 1px solid var(--border-2); color: var(--text-muted); background: var(--surface); letter-spacing: 0.02em; }
      `}</style>

      <div className='txai-root'>
        {/* ── HEADER ── */}
        <header className='txai-header'>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <div className='logo-mark'>
              <Zap size={15} color='white' fill='white' />
            </div>
            <div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: '#f1f5f9',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  fontFamily: 'Syne, sans-serif',
                }}
              >
                TechxAI
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  fontWeight: 500,
                }}
              >
                Our AI Chatbot with BI Dashboard
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
              padding: '32px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: 20,
            }}
          >
            {/* ── EMPTY STATE ── */}
            {messages.length === 0 && (
              <div style={{ paddingTop: 16 }}>
                {/* Hero */}
                <div
                  className='stagger-1'
                  style={{ textAlign: 'center', marginBottom: 40 }}
                >
                  {/* Glow orb */}
                  <div
                    style={{
                      position: 'relative',
                      width: 72,
                      height: 72,
                      margin: '0 auto 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: -16,
                        borderRadius: '50%',
                        background:
                          'radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)',
                      }}
                    />
                    <div
                      style={{
                        width: 72,
                        height: 72,
                        borderRadius: 20,
                        background:
                          'linear-gradient(135deg, #1d4ed8 0%, #2563eb 50%, #3b82f6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow:
                          '0 0 0 1px rgba(59,130,246,0.3), 0 8px 32px rgba(59,130,246,0.35)',
                        position: 'relative',
                      }}
                    >
                      <BarChart2 size={30} color='white' />
                      <div
                        style={{
                          position: 'absolute',
                          top: -6,
                          right: -6,
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 8px rgba(124,58,237,0.5)',
                          border: '2px solid var(--bg)',
                        }}
                      >
                        <Sparkles size={10} color='white' />
                      </div>
                    </div>
                  </div>

                  <h1
                    style={{
                      fontSize: 30,
                      fontWeight: 800,
                      color: '#f8fafc',
                      letterSpacing: '-0.04em',
                      lineHeight: 1.15,
                      fontFamily: 'Syne, sans-serif',
                      marginBottom: 10,
                    }}
                  >
                    AI Data Assistant
                  </h1>
                  <p
                    style={{
                      fontSize: 15,
                      color: 'var(--text-muted)',
                      maxWidth: 380,
                      margin: '0 auto',
                      lineHeight: 1.65,
                      fontWeight: 400,
                    }}
                  >
                    Ask questions about your Corporate or PPM tickets.
                    <br />
                    Summarize, filter, visualize — all in plain English.
                  </p>
                </div>

                {/* Sample query cards */}
                <div
                  className='stagger-2'
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2,1fr)',
                    gap: 10,
                    maxWidth: 660,
                    margin: '0 auto 28px',
                  }}
                >
                  {SAMPLE_QUERIES.map((q, i) => (
                    <button
                      key={i}
                      className='sample-card'
                      onClick={() => handleSend(q.text)}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 8,
                        }}
                      >
                        <span style={{ fontSize: 20, lineHeight: 1 }}>
                          {q.icon}
                        </span>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'var(--accent-dim)',
                              border: '1px solid var(--accent-border)',
                              color: '#60a5fa',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {q.tag}
                          </span>
                          <ArrowUpRight size={13} color='var(--text-dim)' />
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: '#94a3b8',
                          lineHeight: 1.5,
                          display: 'block',
                        }}
                      >
                        {q.text}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Capability badges */}
                <div
                  className='stagger-3'
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    gap: 7,
                  }}
                >
                  {[
                    { icon: '🏢', label: 'Corporate Tickets' },
                    { icon: '🔧', label: 'PPM Tickets' },
                    { icon: '📈', label: 'Charts & Trends' },
                    { icon: '⬇️', label: 'Export CSV' },
                    { icon: '🎯', label: 'Smart Filters' },
                  ].map((b) => (
                    <span key={b.label} className='cap-badge'>
                      <span style={{ fontSize: 13 }}>{b.icon}</span> {b.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── MESSAGES ── */}
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                className='fade-up msg-row'
                style={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  gap: 10,
                }}
              >
                <div
                  className={msg.role === 'user' ? 'avatar-user' : 'avatar-ai'}
                >
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8,
                    minWidth: 0,
                    flex: 1,
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: msg.role === 'user' ? '76%' : '94%',
                  }}
                >
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
                      {formatMessage(msg.content)}
                    </div>
                    <button
                      className='icon-btn'
                      title='Copy'
                      onClick={() => copyText(msg.id, msg.content)}
                      style={{ marginTop: 5 }}
                    >
                      {copiedId === msg.id ? (
                        <Check size={12} color='#34d399' />
                      ) : (
                        <Copy size={12} />
                      )}
                    </button>
                  </div>

                  {msg.role === 'ai' &&
                    msg.data?.suggested_actions &&
                    msg.data.suggested_actions.length > 0 &&
                    index === messages.length - 1 && (
                      <div
                        style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}
                      >
                        {msg.data.suggested_actions.map(
                          (a: string, i: number) => (
                            <span
                              key={i}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                              }}
                            >
                              <button
                                className='action-pill'
                                onClick={() => handleSend(a)}
                              >
                                {a}
                                <button
                                  className='pill-x'
                                  title='Dismiss'
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    dismissPill(a)
                                    setMessages((prev) =>
                                      prev.map((m) =>
                                        m.id === msg.id && m.data
                                          ? {
                                              ...m,
                                              data: {
                                                ...m.data,
                                                suggested_actions:
                                                  m.data.suggested_actions!.filter(
                                                    (_, idx) => idx !== i,
                                                  ),
                                              },
                                            }
                                          : m,
                                      ),
                                    )
                                  }}
                                >
                                  <X size={8} />
                                </button>
                              </button>
                            </span>
                          ),
                        )}
                      </div>
                    )}

                  {msg.data && msg.data.raw_data.length > 0 && (
                    <div style={{ width: '100%' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'flex-end',
                          gap: 7,
                          marginBottom: 8,
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
                        {/* FIX 1: Removed the <= 50 row limit so Visualize always shows for summary intent */}
                        {msg.data.state?.intent === 'summary' && (
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
                        ? renderChart(msg.data.raw_data, msg.data.charts?.[0])
                        : renderTable(msg.data.raw_data)}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing */}
            {isLoading && (
              <div
                className='fade-up'
                style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}
              >
                <div className='avatar-ai'>
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    padding: '13px 16px',
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    borderTopLeftRadius: 4,
                    display: 'flex',
                    gap: 5,
                    alignItems: 'center',
                  }}
                >
                  {[0, 140, 280].map((d) => (
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
              gap: 10,
            }}
          >
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
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Filter size={9} /> Filters
                </span>
                {activeFilterChips.map((chip: any) => (
                  <span
                    key={chip.key}
                    className='filter-chip'
                    style={
                      chip.color === 'purple'
                        ? {
                            background: 'rgba(124,58,237,0.08)',
                            borderColor: 'rgba(124,58,237,0.2)',
                            color: '#a78bfa',
                          }
                        : {
                            background: 'var(--accent-dim)',
                            borderColor: 'var(--accent-border)',
                            color: '#60a5fa',
                          }
                    }
                  >
                    <span style={{ opacity: 0.55 }}>{chip.label}:</span>
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
                        opacity: 0.5,
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
                    color: 'var(--text-dim)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    transition: 'color 0.12s',
                    fontFamily: 'var(--font-body)',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.color = '#f87171')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = 'var(--text-dim)')
                  }
                >
                  Clear all
                </button>
              </div>
            )}

            <form
              onSubmit={handleSubmit}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <textarea
                ref={textareaRef}
                className='txai-input'
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  e.target.style.height = '48px'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 150)}px`
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    if (!isLoading && inputText.trim())
                      handleSubmit(e as unknown as React.FormEvent)
                  }
                }}
                disabled={isLoading}
                placeholder={
                  hasActiveFilters
                    ? 'Search within current filters...'
                    : 'Ask anything about your tickets...'
                }
                rows={1}
                style={{
                  resize: 'none',
                  overflowY: 'auto',
                  minHeight: '52px',
                  paddingTop: '15px',
                  paddingBottom: '15px',
                }}
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
                color: 'var(--text-dim)',
                fontWeight: 500,
              }}
            >
              AI can make mistakes · Verify critical data against the source
              system
            </p>
          </div>
        </footer>

        {/* ── HOW TO USE MODAL ── */}
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
                  padding: '17px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 9,
                      background: 'linear-gradient(135deg,#2563eb,#4f46e5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
                    }}
                  >
                    <Sparkles size={13} color='white' />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: '#f1f5f9',
                        letterSpacing: '-0.02em',
                        fontFamily: 'Syne, sans-serif',
                      }}
                    >
                      How to Write Great Prompts
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: 'var(--text-muted)',
                        fontWeight: 500,
                      }}
                    >
                      Get the most out of TechxAI
                    </div>
                  </div>
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
                  padding: '18px 20px',
                  overflowY: 'auto',
                  maxHeight: '72vh',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 22,
                }}
              >
                <section>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      marginBottom: 10,
                    }}
                  >
                    The Prompt Formula
                  </div>
                  <div
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: '13px 15px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: 8,
                        alignItems: 'flex-start',
                        marginBottom: 12,
                      }}
                    >
                      {[
                        {
                          label: 'Action',
                          eg: 'Show / Breakdown / Count',
                          color: '#60a5fa',
                          bg: 'rgba(59,130,246,0.1)',
                          border: 'rgba(59,130,246,0.2)',
                        },
                        {
                          label: 'Domain',
                          eg: 'PPM / Corporate',
                          color: '#a78bfa',
                          bg: 'rgba(124,58,237,0.1)',
                          border: 'rgba(124,58,237,0.2)',
                        },
                        {
                          label: 'Filter',
                          eg: 'Mumbai · Jan · Assigned',
                          color: '#34d399',
                          bg: 'rgba(16,185,129,0.08)',
                          border: 'rgba(16,185,129,0.18)',
                        },
                        {
                          label: 'Grouping',
                          eg: 'by Company / by Status',
                          color: '#fbbf24',
                          bg: 'rgba(245,158,11,0.08)',
                          border: 'rgba(245,158,11,0.18)',
                        },
                      ].map((p, i) => (
                        <div
                          key={p.label}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 4,
                          }}
                        >
                          {i > 0 && (
                            <span
                              style={{
                                fontSize: 12,
                                color: 'var(--text-dim)',
                                fontWeight: 600,
                              }}
                            >
                              +
                            </span>
                          )}
                          <div
                            style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '3px 11px',
                                borderRadius: 99,
                                background: p.bg,
                                border: `1px solid ${p.border}`,
                                color: p.color,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {p.label}
                            </span>
                            <span
                              style={{
                                fontSize: 10,
                                color: 'var(--text-muted)',
                                fontWeight: 500,
                                textAlign: 'center',
                              }}
                            >
                              {p.eg}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#94a3b8',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--border)',
                        paddingTop: 10,
                      }}
                    >
                      <strong style={{ color: '#e2e8f0' }}>Example:</strong>{' '}
                      <span style={{ fontStyle: 'italic', color: '#60a5fa' }}>
                        "Breakdown of PPM tickets in Mumbai for January by
                        status"
                      </span>
                    </div>
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      marginBottom: 10,
                    }}
                  >
                    Good vs. Vague Prompts
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 7 }}
                  >
                    {[
                      {
                        bad: 'show tickets',
                        good: 'Show me assigned PPM tickets in Mumbai for January',
                        tip: 'Add domain, location, timeframe, and status',
                      },
                      {
                        bad: 'company data',
                        good: 'Breakdown of corporate tickets by company this month',
                        tip: 'Specify the breakdown + timeframe',
                      },
                      {
                        bad: 'how many closed',
                        good: 'Count of closed PPM tickets in 2025 company-wise',
                        tip: 'Ask it to group results — you get a chart',
                      },
                    ].map((ex, i) => (
                      <div
                        key={i}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          overflow: 'hidden',
                        }}
                      >
                        <div className='htuse-example-row'>
                          <div
                            style={{
                              padding: '9px 12px',
                              borderRight: '1px solid var(--border)',
                            }}
                          >
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#f87171',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: 4,
                              }}
                            >
                              ✗ Vague
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#64748b',
                                fontStyle: 'italic',
                              }}
                            >
                              "{ex.bad}"
                            </div>
                          </div>
                          <div style={{ padding: '9px 12px' }}>
                            <div
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: '#34d399',
                                textTransform: 'uppercase',
                                letterSpacing: '0.06em',
                                marginBottom: 4,
                              }}
                            >
                              ✓ Specific
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: '#cbd5e1',
                                fontStyle: 'italic',
                              }}
                            >
                              "{ex.good}"
                            </div>
                          </div>
                        </div>
                        <div className='htuse-tip-bar'>
                          <Zap size={10} color='#fbbf24' />
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>
                            {ex.tip}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      marginBottom: 10,
                    }}
                  >
                    Filters You Can Use
                  </div>
                  <div className='htuse-filter-grid'>
                    {[
                      {
                        icon: '🏢',
                        label: 'Domain',
                        values: ['PPM tickets', 'Corporate tickets'],
                        hint: 'Defaults to Corporate',
                      },
                      {
                        icon: '📍',
                        label: 'Location',
                        values: ['Mumbai', 'Delhi', 'Bangalore', 'Maharashtra'],
                        hint: 'City or state name',
                      },
                      {
                        icon: '🗓️',
                        label: 'Timeframe',
                        values: [
                          'January 2026',
                          'this month',
                          'Q1 2025',
                          '2024',
                        ],
                        hint: 'Month, quarter, or year',
                      },
                      {
                        icon: '🔖',
                        label: 'Status',
                        values: ['Closed', 'Assigned', 'In Progress'],
                        hint: 'Ticket status filter',
                      },
                      {
                        icon: '🔧',
                        label: 'Service Type',
                        values: ['AMC', 'R&M', 'HVAC', 'Electrician'],
                        hint: 'Applies within domain',
                      },
                      {
                        icon: '📊',
                        label: 'Grouping',
                        values: [
                          'by company',
                          'by status',
                          'by branch',
                          'month-wise',
                        ],
                        hint: 'Triggers a chart view',
                      },
                    ].map((f) => (
                      <div
                        key={f.label}
                        style={{
                          background: 'var(--surface-2)',
                          border: '1px solid var(--border)',
                          borderRadius: 10,
                          padding: '10px 12px',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 5,
                            marginBottom: 6,
                          }}
                        >
                          <span style={{ fontSize: 14 }}>{f.icon}</span>
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 700,
                              color: '#e2e8f0',
                              fontFamily: 'Syne, sans-serif',
                            }}
                          >
                            {f.label}
                          </span>
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            marginBottom: 5,
                          }}
                        >
                          {f.values.map((v) => (
                            <span
                              key={v}
                              style={{
                                fontSize: 10,
                                fontWeight: 600,
                                padding: '2px 7px',
                                borderRadius: 99,
                                background: 'var(--surface)',
                                border: '1px solid var(--border-2)',
                                color: '#64748b',
                              }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: 'var(--text-dim)',
                            fontWeight: 500,
                          }}
                        >
                          {f.hint}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      marginBottom: 10,
                    }}
                  >
                    Context & Follow-ups
                  </div>
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
                  >
                    {[
                      {
                        step: '1',
                        q: 'Breakdown of PPM tickets in Mumbai by company',
                        tag: 'first ask',
                      },
                      {
                        step: '2',
                        q: 'Filter to January only',
                        tag: 'adds timeframe',
                      },
                      {
                        step: '3',
                        q: 'Show me only the closed ones',
                        tag: 'adds status',
                      },
                      {
                        step: '4',
                        q: 'Give me the raw ticket list',
                        tag: 'switches to detail',
                      },
                    ].map((s) => (
                      <div key={s.step} className='htuse-step-row'>
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            background: 'var(--accent-dim)',
                            border: '1px solid var(--accent-border)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: '#60a5fa',
                            }}
                          >
                            {s.step}
                          </span>
                        </div>
                        <div
                          style={{
                            flex: 1,
                            background: 'var(--surface-2)',
                            border: '1px solid var(--border)',
                            borderRadius: 8,
                            padding: '7px 11px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              color: '#94a3b8',
                              fontStyle: 'italic',
                            }}
                          >
                            "{s.q}"
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: 99,
                              background: 'var(--accent-dim)',
                              border: '1px solid var(--accent-border)',
                              color: '#60a5fa',
                              whiteSpace: 'nowrap',
                              flexShrink: 0,
                            }}
                          >
                            {s.tag}
                          </span>
                        </div>
                      </div>
                    ))}
                    <p
                      style={{
                        fontSize: 12,
                        color: '#64748b',
                        marginTop: 2,
                        lineHeight: 1.6,
                      }}
                    >
                      AI remembers all active filters. Use the{' '}
                      <strong style={{ color: '#94a3b8' }}>
                        chips above the input
                      </strong>{' '}
                      to remove them.
                    </p>
                  </div>
                </section>

                <section>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-dim)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.09em',
                      marginBottom: 8,
                    }}
                  >
                    What's Off Limits
                  </div>
                  <div
                    style={{
                      background: 'rgba(245,158,11,0.05)',
                      border: '1px solid rgba(245,158,11,0.15)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>
                      🔒
                    </span>
                    <p
                      style={{
                        fontSize: 12,
                        color: '#92817a',
                        lineHeight: 1.65,
                      }}
                    >
                      Financial, billing, quotation, and payment records are
                      restricted. Questions about prices, costs, or vendor
                      payouts will be blocked automatically.
                    </p>
                  </div>
                </section>
              </div>

              <div
                style={{
                  padding: '13px 20px',
                  borderTop: '1px solid var(--border)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  background: 'rgba(0,0,0,0.2)',
                }}
              >
                <button
                  onClick={() => setShowInstructions(false)}
                  style={{
                    padding: '9px 22px',
                    borderRadius: 10,
                    background: 'var(--accent)',
                    border: 'none',
                    color: 'white',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                    boxShadow: '0 2px 12px rgba(59,130,246,0.35)',
                    transition: 'all 0.13s',
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = '#2563eb')
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = 'var(--accent)')
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
