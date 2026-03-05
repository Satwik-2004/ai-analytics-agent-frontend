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
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

// --- TYPES ---
interface AIResponse {
  status: string
  summary: string
  charts?: any[]
  raw_data: any[]
  insight: string | null
  state?: Record<string, any>
  suggested_actions?: string[] // NEW: Added suggested actions
}

interface Message {
  id: string
  role: 'user' | 'ai'
  content: string
  data?: AIResponse
  showChart?: boolean
}

// --- CHAT INPUT (isolated to prevent re-render lag) ---
const ChatInput = ({ onSend, isLoading, searchState }: any) => {
  const [text, setText] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const hasActiveFilters =
    searchState &&
    Object.values(searchState).some(
      (v) => v !== null && v !== 'corporate_tickets' && v !== 'detail',
    )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (text.trim() && !isLoading) {
      onSend(text)
      setText('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className='relative flex items-center'>
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={isLoading}
        placeholder={
          hasActiveFilters
            ? 'Search within current filters...'
            : 'Ask anything about your tickets...'
        }
        className='w-full bg-white border border-slate-200 rounded-2xl pl-5 pr-14 py-4 text-slate-800 text-[15px] shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400 disabled:opacity-50 transition-all'
      />
      <button
        type='submit'
        disabled={isLoading || !text.trim()}
        className='absolute right-2 w-10 h-10 bg-blue-600 text-white rounded-xl flex items-center justify-center hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-sm active:scale-95'
      >
        {isLoading ? (
          <Loader2 size={17} className='animate-spin' />
        ) : (
          <Send size={17} />
        )}
      </button>
    </form>
  )
}

// --- COPY BUTTON with feedback ---
const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      title='Copy response'
      className='p-1.5 text-slate-300 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all opacity-0 group-hover:opacity-100'
    >
      {copied ? (
        <Check size={14} className='text-green-500' />
      ) : (
        <Copy size={14} />
      )}
    </button>
  )
}

// --- FILTER CHIP ---
const FilterChip = ({
  label,
  value,
  onRemove,
  color = 'blue',
}: {
  label: string
  value: string
  onRemove: () => void
  color?: 'blue' | 'purple'
}) => {
  const colors = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    purple:
      'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
  }
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-semibold border transition-colors ${colors[color]}`}
    >
      <span className='opacity-60'>{label}:</span>
      {value}
      <button
        onClick={onRemove}
        className='ml-0.5 rounded-full p-0.5 hover:bg-black/10 transition-colors'
      >
        <X size={11} />
      </button>
    </span>
  )
}

// --- MAIN COMPONENT ---
export default function ChatDashboard() {
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchState, setSearchState] = useState<Record<string, any> | null>(
    null,
  )
  const [showInstructions, setShowInstructions] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  const handleSend = async (text: string) => {
    if (!text.trim()) return
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), role: 'user', content: text },
    ])
    setIsLoading(true)

    try {
      const response = await fetch('http://localhost:8000/api/v1/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          turn_count: 0,
          state: searchState,
        }),
      })
      const data = await response.json()
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

  const toggleChart = (msgId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === msgId ? { ...msg, showChart: !msg.showChart } : msg,
      ),
    )
  }

  const removeFilter = (key: string, defaultValue: any = null) => {
    setSearchState((prev) => (prev ? { ...prev, [key]: defaultValue } : null))
  }

  const clearChat = () => {
    setMessages([])
    setSearchState(null)
  }

  // Active filter chips to show
  const activeFilterChips = searchState
    ? [
        searchState.domain === 'ppm_tickets'
          ? {
              key: 'domain',
              label: 'Domain',
              value: 'PPM',
              color: 'purple' as const,
              defaultValue: 'corporate_tickets',
            }
          : null,
        searchState.company_name
          ? {
              key: 'company_name',
              label: 'Company',
              value: searchState.company_name,
              color: 'blue' as const,
            }
          : null,
        searchState.branch_name
          ? {
              key: 'branch_name',
              label: 'Branch',
              value: searchState.branch_name,
              color: 'blue' as const,
            }
          : null,
        searchState.timeframe
          ? {
              key: 'timeframe',
              label: 'Time',
              value: searchState.timeframe,
              color: 'blue' as const,
            }
          : null,
        searchState.status
          ? {
              key: 'status',
              label: 'Status',
              value: searchState.status,
              color: 'blue' as const,
            }
          : null,
        searchState.priority
          ? {
              key: 'priority',
              label: 'Priority',
              value: searchState.priority,
              color: 'blue' as const,
            }
          : null,
      ].filter(Boolean)
    : []

  const hasActiveFilters = activeFilterChips.length > 0

  // --- RENDERERS ---
const renderChart = (data: any[]) => {
  if (!data || data.length === 0) return null
  const keys = Object.keys(data[0])
  if (keys.length < 2)
    return (
      <p className='text-sm text-slate-500 p-4'>
        Not enough data to visualize.
      </p>
    )
  const xKey = keys[0]
  const yKey = keys[1]

  return (
    <div
      className='w-full mt-3 bg-white p-4 rounded-xl border border-slate-200'
      style={{ height: '320px' }}
    >
      <ResponsiveContainer width='100%' height='100%'>
        <BarChart
          data={data}
          margin={{ top: 10, right: 10, left: -20, bottom: 35 }}
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
            angle={-40}
            textAnchor='end'
            interval={0}
            height={40}
            tick={(props) => {
              const { x, y, payload } = props
              const yNum = Number(y);
              const label =
                payload.value.length > 14
                  ? `${payload.value.substring(0, 14)}...`
                  : payload.value
              return (
                <text
                  x={x}
                  y={yNum + 6}
                  textAnchor='end'
                  fill='#94a3b8'
                  fontSize={10}
                  transform={`rotate(-40, ${x}, ${yNum + 6})`}
                >
                  {label}
                </text>
              )
            }}
          />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <RechartsTooltip
            cursor={{ fill: '#f8fafc' }}
            contentStyle={{
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
              fontSize: 13,
            }}
          />
          <Bar
            dataKey={yKey}
            fill='#3b82f6'
            radius={[5, 5, 0, 0]}
            barSize={36}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

  const renderTable = (data: any[]) => {
    if (!data || data.length === 0) return null
    if (data.length === 1 && Object.keys(data[0]).length === 1) {
      return (
        <div className='mt-3 px-5 py-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-800 font-semibold text-lg'>
          {String(Object.values(data[0])[0])}
        </div>
      )
    }
    const headers = Object.keys(data[0])
    return (
      <div className='mt-3 w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
        <div className='bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide'>
          <LayoutList size={13} />
          {data.length} rows
        </div>
        <div className='overflow-x-auto max-h-80'>
          <Table>
            <TableHeader className='bg-slate-50/80 sticky top-0 z-10'>
              <TableRow>
                {headers.map((h) => (
                  <TableHead
                    key={h}
                    className='font-semibold text-slate-600 text-xs whitespace-nowrap py-2.5'
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
                  className='hover:bg-slate-50/70 transition-colors'
                >
                  {headers.map((h, j) => (
                    <TableCell
                      key={j}
                      className='whitespace-nowrap max-w-50 truncate text-slate-600 text-[13px] py-2.5'
                    >
                      {row[h] !== null && row[h] !== '' ? (
                        String(row[h])
                      ) : (
                        <span className='text-slate-300'>—</span>
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
    'Give me a breakdown of corporate tickets by company',
    'Show me PPM ticket status across companies last month',
    'Total closed tickets in the last 30 days',
    'PPM tickets for HVAC services in Mumbai',
  ]

  return (
    <div className='flex flex-col h-screen bg-slate-50 font-sans overflow-hidden'>
      {/* HEADER */}
      <header className='shrink-0 bg-white border-b border-slate-200 px-5 py-3.5 flex items-center justify-between z-20 shadow-sm'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm'>
            <Sparkles className='w-4.5 h-4.5 text-white' size={18} />
          </div>
          <div>
            <h1 className='text-[15px] font-bold text-slate-800 leading-tight tracking-tight'>
              Data Analytics AI
            </h1>
            <p className='text-[11px] text-slate-400 font-medium'>
              Enterprise Search Engine
            </p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className='flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-red-500 px-3 py-2 rounded-lg hover:bg-red-50 transition-all'
            >
              <Trash2 size={14} /> Clear
            </button>
          )}
          <button
            onClick={() => setShowInstructions(true)}
            className='flex items-center gap-1.5 text-[13px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-lg transition-all border border-blue-100'
          >
            <Info size={14} /> How to Use
          </button>
        </div>
      </header>

      {/* CHAT AREA — scrollable, padded so content never hides under footer */}
      <main className='flex-1 overflow-y-auto'>
        <div className='max-w-4xl mx-auto px-4 py-6 space-y-6'>
          {/* Empty state */}
          {messages.length === 0 && (
            <div className='mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
              <div className='bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center mb-6'>
                <div className='w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4'>
                  <BarChart2 size={28} className='text-blue-500' />
                </div>
                <h2 className='text-xl font-bold text-slate-800 mb-2'>
                  AI Data Assistant
                </h2>
                <p className='text-slate-500 text-[14px] max-w-md mx-auto leading-relaxed'>
                  Ask questions about your Corporate or PPM tickets. Summarize,
                  filter, visualize — all in plain English.
                </p>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                {SAMPLE_QUERIES.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(q)}
                    className='p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-400 hover:shadow-md hover:text-blue-700 transition-all text-left text-slate-600 text-[13px] font-medium leading-snug'
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg, index) => (
            <div
              key={msg.id}
              className={`flex gap-3 animate-in fade-in duration-300 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                    : 'bg-white border border-slate-200 text-slate-500 shadow-sm'
                }`}
              >
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              {/* Bubble + data */}
              <div
                className={`flex flex-col gap-2 min-w-0 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className='flex items-start gap-1.5 group w-full'>
                  <div
                    className={`px-4 py-3 text-[14px] leading-relaxed rounded-2xl shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-tr-sm'
                        : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                  {msg.role === 'ai' && <CopyButton text={msg.content} />}
                </div>

                {/* NEW: Suggested Actions (Quick Reply Buttons) */}
                {/* We only render these if it's an AI message, it has buttons, AND it's the very last message in the chat */}
                {msg.role === 'ai' &&
                  msg.data?.suggested_actions &&
                  msg.data.suggested_actions.length > 0 &&
                  index === messages.length - 1 && (
                    <div className='flex flex-wrap gap-2 mt-1 mb-2'>
                      {msg.data.suggested_actions.map((action, i) => (
                        <button
                          key={i}
                          onClick={() => handleSend(action)}
                          className='text-[13px] px-3.5 py-1.5 bg-white text-blue-600 border border-blue-200 hover:bg-blue-50 rounded-full transition-all shadow-sm font-semibold active:scale-95 flex items-center gap-1.5'
                        >
                          {action}
                        </button>
                      ))}
                    </div>
                  )}

                {/* Data results */}
                {msg.data?.raw_data && msg.data.raw_data.length > 0 && (
                  <div className='w-full mt-2'>
                    {/* ONLY show chart toggle if it's a summary AND under 50 rows */}
                    {msg.data.state?.intent === 'summary' &&
                      msg.data.raw_data.length <= 50 && (
                        <div className='flex justify-end mb-2'>
                          <button
                            onClick={() => toggleChart(msg.id)}
                            className='flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[12px] font-semibold rounded-lg shadow-sm hover:bg-slate-50 hover:text-blue-600 transition-all'
                          >
                            {msg.showChart ? (
                              <>
                                <TableIcon size={13} /> Show Table
                              </>
                            ) : (
                              <>
                                <BarChart2 size={13} /> Visualize
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    {msg.showChart
                      ? renderChart(msg.data.raw_data)
                      : renderTable(msg.data.raw_data)}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Loading */}
          {isLoading && (
            <div className='flex gap-3 animate-in fade-in duration-300'>
              <div className='w-8 h-8 rounded-xl bg-white border border-slate-200 text-slate-400 shadow-sm flex items-center justify-center shrink-0'>
                <Bot size={16} />
              </div>
              <div className='px-4 py-3 rounded-2xl rounded-tl-sm bg-white border border-slate-200 text-slate-400 shadow-sm flex items-center gap-2 text-[13px]'>
                <span className='flex gap-1 items-center'>
                  <span
                    className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0ms' }}
                  />
                  <span
                    className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
                    style={{ animationDelay: '120ms' }}
                  />
                  <span
                    className='w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce'
                    style={{ animationDelay: '240ms' }}
                  />
                </span>
                Analyzing...
              </div>
            </div>
          )}

          {/* Scroll anchor — extra space so last message isn't hidden by footer */}
          <div ref={messagesEndRef} className='h-4' />
        </div>
      </main>

      {/* FOOTER — sticky at bottom, part of flex layout (NOT fixed) */}
      <footer className='shrink-0 bg-white border-t border-slate-200 px-4 py-3.5'>
        <div className='max-w-4xl mx-auto flex flex-col gap-2.5'>
          {/* Filter chips */}
          {hasActiveFilters && (
            <div className='flex flex-wrap items-center gap-1.5'>
              <span className='flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-0.5'>
                <Filter size={11} /> Filters:
              </span>
              {activeFilterChips.map((chip: any) => (
                <FilterChip
                  key={chip.key}
                  label={chip.label}
                  value={chip.value}
                  color={chip.color}
                  onRemove={() =>
                    removeFilter(chip.key, chip.defaultValue ?? null)
                  }
                />
              ))}
              <button
                onClick={() => setSearchState(null)}
                className='text-[11px] font-medium text-slate-400 hover:text-red-500 ml-1 transition-colors'
              >
                Clear all
              </button>
            </div>
          )}

          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            searchState={searchState}
          />
          <p className='text-[11px] text-center text-slate-400 font-medium'>
            AI can make mistakes. Verify critical data against the source
            system.
          </p>
        </div>
      </footer>

      {/* INSTRUCTIONS MODAL */}
      {showInstructions && (
        <div
          className='fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4'
          onClick={(e) =>
            e.target === e.currentTarget && setShowInstructions(false)
          }
        >
          <div className='bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200'>
            <div className='px-6 py-4 border-b border-slate-100 flex justify-between items-center'>
              <h3 className='text-base font-bold text-slate-800 flex items-center gap-2'>
                <Info size={17} className='text-blue-600' /> How to Use
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className='text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors'
              >
                <X size={18} />
              </button>
            </div>
            <div className='p-6 overflow-y-auto max-h-[65vh] text-slate-600 space-y-5 text-[14px]'>
              <section>
                <h4 className='font-bold text-slate-800 mb-2'>
                  Available Databases
                </h4>
                <div className='grid grid-cols-2 gap-3'>
                  <div className='p-3.5 rounded-xl bg-blue-50 border border-blue-100'>
                    <strong className='text-blue-700 text-[13px] block mb-1'>
                      Corporate Tickets
                    </strong>
                    <span className='text-slate-500 text-[12px]'>
                      General reactive maintenance. Default domain.
                    </span>
                  </div>
                  <div className='p-3.5 rounded-xl bg-violet-50 border border-violet-100'>
                    <strong className='text-violet-700 text-[13px] block mb-1'>
                      PPM Tickets
                    </strong>
                    <span className='text-slate-500 text-[12px]'>
                      Planned Preventive Maintenance. Say "PPM" to switch.
                    </span>
                  </div>
                </div>
              </section>
              <section>
                <h4 className='font-bold text-slate-800 mb-2'>Tips</h4>
                <ul className='space-y-2'>
                  {[
                    [
                      'Be specific with time',
                      '"in January 2026" or "last 30 days"',
                    ],
                    [
                      'Drill down',
                      '"Show me details for [Company Name]" — AI remembers context',
                    ],
                    [
                      'Clear filters',
                      'Use the ✕ chips above the input to reset your search scope',
                    ],
                  ].map(([title, desc]) => (
                    <li key={title} className='flex gap-2.5'>
                      <span className='w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 shrink-0' />
                      <span>
                        <strong className='text-slate-700'>{title}:</strong>{' '}
                        {desc}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h4 className='font-bold text-slate-800 mb-1'>Privacy</h4>
                <p className='text-slate-500 text-[13px]'>
                  Financial, billing, and quotation records are off-limits. The
                  AI cannot answer questions about prices, costs, or vendor
                  payouts.
                </p>
              </section>
            </div>
            <div className='px-6 py-3.5 border-t border-slate-100 bg-slate-50 flex justify-end'>
              <button
                onClick={() => setShowInstructions(false)}
                className='bg-blue-600 text-white px-5 py-2 rounded-lg text-[14px] font-semibold hover:bg-blue-700 transition-colors'
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
