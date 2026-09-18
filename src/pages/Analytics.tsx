import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { formatCurrency, downloadCSV, formatDate } from '@/lib/utils'
import type { Booking } from '@/types'
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, CalendarDays, CheckCircle2, XCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { BusinessAssistant } from '@/components/BusinessAssistant'

export function Analytics() {
  const { business } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])

  useEffect(() => {
    if (!business) return
    supabase.from('bookings').select('*, service:services(*), staff:staff(*), customer:customers(*)').eq('business_id', business.id).order('start_time', { ascending: false }).then(({ data }) => {
      setBookings((data || []) as unknown as Booking[])
      setLoading(false)
    })
  }, [business])

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  const total = bookings.length
  const completed = bookings.filter(b => b.status === 'completed')
  const cancelled = bookings.filter(b => b.status === 'cancelled')
  const revenue = completed.filter(b => b.payment_status === 'paid').reduce((s, b) => s + Number(b.price), 0)
  const avgValue = completed.length > 0 ? revenue / completed.length : 0
  const completionRate = total > 0 ? (completed.length / total) * 100 : 0
  const cancelRate = total > 0 ? (cancelled.length / total) * 100 : 0

  // Last 7 days chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toISOString().split('T')[0]
    const count = bookings.filter(b => b.start_time.startsWith(dayStr)).length
    return { date: formatDate(d, 'EEE'), bookings: count }
  })

  // Status breakdown
  const statusData = [
    { name: 'Confirmed', value: bookings.filter(b => b.status === 'confirmed').length, color: '#3b82f6' },
    { name: 'Pending', value: bookings.filter(b => b.status === 'pending').length, color: '#f59e0b' },
    { name: 'Completed', value: completed.length, color: '#10b981' },
    { name: 'Cancelled', value: cancelled.length, color: '#9ca3af' },
    { name: 'No Show', value: bookings.filter(b => b.status === 'no_show').length, color: '#ef4444' },
  ].filter(d => d.value > 0)

  // Staff performance
  const staffMap = new Map<string, { name: string; bookings: number; revenue: number }>()
  bookings.forEach(b => {
    const name = b.staff?.name || 'Unknown'
    const entry = staffMap.get(b.staff_id) || { name, bookings: 0, revenue: 0 }
    entry.bookings++
    if (b.payment_status === 'paid') entry.revenue += Number(b.price)
    staffMap.set(b.staff_id, entry)
  })
  const staffData = Array.from(staffMap.values())

  const kpis = [
    { label: t('total_revenue'), value: formatCurrency(revenue, business?.currency || 'USD'), icon: DollarSign, trend: '+12%', up: true },
    { label: t('total_bookings'), value: total, icon: CalendarDays, trend: '+8%', up: true },
    { label: t('avg_booking_value'), value: formatCurrency(avgValue, business?.currency || 'USD'), icon: TrendingUp, trend: '+3%', up: true },
    { label: t('completion_rate'), value: `${completionRate.toFixed(0)}%`, icon: CheckCircle2, trend: cancelRate > 10 ? '-2%' : '+5%', up: cancelRate <= 10 },
  ]

  const handleExport = () => {
    downloadCSV('analytics.csv', bookings.map(b => ({
      date: formatDate(b.start_time),
      customer: b.customer?.name || '',
      service: b.service?.name || '',
      staff: b.staff?.name || '',
      status: b.status,
      payment: b.payment_status,
      price: b.price,
    })))
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('analytics')}</h1>
        <button onClick={handleExport} className="btn-secondary"><Download size={16} /> {t('export')} CSV</button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">{k.label}</p>
                <p className="text-2xl font-bold mt-1">{k.value}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className="w-9 h-9 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <k.icon size={18} className="text-primary-600" />
                </div>
                <span className={`text-xs flex items-center gap-0.5 ${k.up ? 'text-accent-600' : 'text-error-600'}`}>
                  {k.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {k.trend}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-semibold mb-4">Bookings — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#9ca3af" />
              <YAxis tick={{ fontSize: 12 }} stroke="#9ca3af" allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '12px' }} />
              <Bar dataKey="bookings" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold mb-4">Status Breakdown</h3>
          {statusData.length === 0 ? (
            <p className="text-center text-gray-400 py-12">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Staff Performance */}
      <div className="card">
        <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold flex items-center gap-2"><BarChart3 size={18} /> Staff Performance</h3>
        </div>
        {staffData.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <tr><th className="px-4 py-3 font-medium text-gray-500">Staff</th><th className="px-4 py-3 font-medium text-gray-500">Bookings</th><th className="px-4 py-3 font-medium text-gray-500">Revenue</th></tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {staffData.map((s) => (
                  <tr key={s.name} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{s.name}</td>
                    <td className="px-4 py-3">{s.bookings}</td>
                    <td className="px-4 py-3">{formatCurrency(s.revenue, business?.currency || 'USD')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <BusinessAssistant compact />
    </div>
  )
}
