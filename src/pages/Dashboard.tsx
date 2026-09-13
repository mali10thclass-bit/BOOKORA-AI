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
  TrendingUp, ArrowRight, Loader2, AlertCircle,
} from 'lucide-react'

interface DashboardStats {
  totalBookings: number
  revenue: number
  activeCustomers: number
  staffCount: number
}

const colorMap: Record<string, string> = {
  primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400',
  accent: 'bg-accent-50 dark:bg-accent-900/20 text-accent-600 dark:text-accent-400',
  warning: 'bg-warning-50 dark:bg-warning-900/20 text-warning-600 dark:text-warning-400',
}

export function Dashboard() {
  const { business } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    totalBookings: 0,
    revenue: 0,
    activeCustomers: 0,
    staffCount: 0,
  })
  const [recentBookings, setRecentBookings] = useState<Booking[]>([])
  const [todayCount, setTodayCount] = useState(0)

  useEffect(() => {
    if (!business) return

    async function load() {
      try {
        setError(null)
        const [bookingsRes, customersRes, staffRes, todayRes] = await Promise.all([
          supabase
            .from('bookings')
            .select('*, service:services(*), staff:staff(*), customer:customers(*)')
            .eq('business_id', business.id)
            .order('created_at', { ascending: false })
            .limit(10),
          supabase
            .from('customers')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id),
          supabase
            .from('staff')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .eq('is_active', true),
          supabase
            .from('bookings')
            .select('id', { count: 'exact', head: true })
            .eq('business_id', business.id)
            .gte('start_time', new Date().toISOString().split('T')[0]),
        ])

        if (bookingsRes.error || customersRes.error || staffRes.error || todayRes.error) {
          setError('Failed to load dashboard data')
          setLoading(false)
          return
        }

        const bookings = bookingsRes.data || []
        const revenue = bookings
          .filter((b: Booking) => b.payment_status === 'paid')
          .reduce((sum: number, b: Booking) => sum + Number(b.price || 0), 0)

        setStats({
          totalBookings: bookingsRes.count || 0,
          revenue,
          activeCustomers: customersRes.count || 0,
          staffCount: staffRes.count || 0,
        })
        setRecentBookings((bookings as unknown as Booking[]).slice(0, 10))
        setTodayCount(todayRes.count || 0)
        setLoading(false)
      } catch (err) {
        console.error('Dashboard load error:', err)
        setError('An error occurred while loading the dashboard')
        setLoading(false)
      }
    }

    load()
  }, [business])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-2 text-primary-600" />
          <p className="text-sm text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center max-w-md">
          <AlertCircle size={32} className="mx-auto mb-2 text-error-600" />
          <p className="text-sm text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  const kpis = [
    {
      label: t('total_bookings'),
      value: stats.totalBookings,
      icon: CalendarDays,
      sub: `${todayCount} today`,
      color: 'primary',
    },
    {
      label: t('revenue'),
      value: formatCurrency(stats.revenue, business?.currency || 'USD'),
      icon: DollarSign,
      sub: 'paid bookings',
      color: 'accent',
    },
    {
      label: t('active_customers'),
      value: stats.activeCustomers,
      icon: Users,
      sub: 'total registered',
      color: 'warning',
    },
    {
      label: t('staff_members'),
      value: stats.staffCount,
      icon: UserCog,
      sub: 'active staff',
      color: 'primary',
    },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t('welcome_back')}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's what's happening at {business?.name}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          const bgClass = colorMap[kpi.color] || colorMap.primary

          return (
            <div key={kpi.label} className="card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold mt-1">{kpi.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{kpi.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center`}>
                  <Icon size={20} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Recent Bookings */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold flex items-center gap-2">
            <TrendingUp size={18} className="text-primary-600" />
            {t('recent_bookings')}
          </h2>
          <Link
            to="/bookings"
            className="text-sm text-primary-600 hover:underline flex items-center gap-1"
          >
            {t('view_all')} <ArrowRight size={14} />
          </Link>
        </div>
        {recentBookings.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title={t('no_bookings')}
            description="Create your first booking to get started"
          />
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{booking.customer?.name || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">
                    {booking.service?.name} · {booking.staff?.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm">
                    {formatDate(booking.start_time)}, {formatTime(booking.start_time)}
                  </p>
                  <div className="flex items-center gap-1.5 justify-end mt-0.5">
                    <StatusBadge status={booking.status} />
                    <StatusBadge status={booking.payment_status} />
                  </div>
                </div>
                <p className="text-sm font-medium w-20 text-right shrink-0">
                  {formatCurrency(Number(booking.price || 0), business?.currency || 'USD')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
