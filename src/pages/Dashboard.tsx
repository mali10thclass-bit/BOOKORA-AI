import { useEffect, useState } from 'react'
import { Link } from '@/lib/router-compat'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { formatCurrency, formatDate, formatTime } from '@/lib/utils'
import type { Booking } from '@/types'
import {
  CalendarDays, DollarSign, Users, UserCog,
  TrendingUp, ArrowRight,
} from 'lucide-react'

export function Dashboard() {
  const { business } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalBookings: 0, revenue: 0, activeCustomers: 0, staffCount: 0 })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    if (!business) return
    async function load() {
      const [bookingsRes, customersRes, staffRes, todayRes] = await Promise.all([
        supabase.from('bookings').select('*, service:services(*), staff:staff(*), customer:customers(*)').eq('business_id', business!.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('customers').select('id', { count: 'exact', head: true }).eq('business_id', business!.id),
        supabase.from('staff').select('id', { count: 'exact', head: true }).eq('business_id', business!.id).eq('is_active', true),
        supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('business_id', business!.id).gte('start_time', new Date().toISOString().split('T')[0]),
      ])

      const bookings = bookingsRes.data || []
      const revenue = bookings.filter((b: Booking) => b.payment_status === 'paid').reduce((sum: number, b: Booking) => sum + Number(b.price), 0)

      setStats({
        totalBookings: bookingsRes.count || 0,
        revenue,
        activeCustomers: customersRes.count || 0,
        staffCount: staffRes.count || 0,
      })
      setRecentBookings(bookings as unknown as Booking[])
      setTodayCount(todayRes.count || 0)
      setLoading(false)
    }
    load()
  }, [business])

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  }

  const kpis = [
    { label: t('total_bookings'), value: stats.totalBookings, icon: CalendarDays, sub: `${todayCount} today`, color: 'primary' },
    { label: t('revenue'), value: formatCurrency(stats.revenue, business?.currency || 'USD'), icon: DollarSign, sub: 'paid bookings', color: 'accent' },
    { label: t('active_customers'), value: stats.activeCustomers, icon: Users, sub: 'total registered', color: 'warning' },
    { label: t('staff_members'), value: stats.staffCount, icon: UserCog, sub: 'active staff', color: 'primary' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome_back')}</h1>
        <p className="text-sm text-gray-500 mt-1">Here's what's happening at {business?.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="card p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{kpi.label}</p>
                <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
              </div>
              <div className={`w-10 h-10 rounded-lg bg-${kpi.color}-50 dark:bg-${kpi.color}-900/20 flex items-center justify-center`}>
                <kpi.icon size={20} className={`text-${kpi.color}-600 dark:text-${kpi.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            {t('recent_bookings')}
          </h2>
          <Link to="/bookings" className="text-sm text-primary-600 hover:underline flex items-center gap-1">
            {t('view_all')} <ArrowRight size={14} />
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('no_bookings')} description="Create your first booking to get started" />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 px-5 py-3 table-row-hover">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{booking.customer?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{booking.service?.name} · {booking.staff?.name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm">{formatDate(booking.start_time)}, {formatTime(booking.start_time)}</p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <StatusBadge status={booking.status} />
                    <StatusBadge status={booking.payment_status} />
                  </div>
                </div>
                <p className="text-sm font-medium w-20 text-right shrink-0">{formatCurrency(Number(booking.price), business?.currency || 'USD')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
