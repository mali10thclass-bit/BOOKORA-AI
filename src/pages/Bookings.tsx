import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { StatusBadge } from '@/components/StatusBadge'
import { EmptyState } from '@/components/EmptyState'
import { Modal } from '@/components/Modal'
import { formatCurrency, formatDate, formatTime, downloadCSV } from '@/lib/utils'
import type { Booking, Service, Staff, Customer, BookingStatus } from '@/types'
import {
  CalendarDays, Plus, Search, Download, Filter, X,
  Check, Clock, XCircle, Trash2, Edit, ChevronDown,
} from 'lucide-react'

export function Bookings() {
  const { business } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<BookingStatus | 'all'>('all')
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<Booking | null>(null)

  const loadData = useCallback(async () => {
    if (!business) return
    const [b, s, st, c] = await Promise.all([
      supabase.from('bookings').select('*, service:services(*), staff:staff(*), customer:customers(*)').eq('business_id', business.id).order('start_time', { ascending: false }),
      supabase.from('services').select('*').eq('business_id', business.id).eq('is_active', true),
      supabase.from('staff').select('*').eq('business_id', business.id).eq('is_active', true),
      supabase.from('customers').select('*').eq('business_id', business.id),
    ])
    setBookings((b.data || []) as unknown as Booking[])
    setServices(s.data || [])
    setStaffList(st.data || [])
    setCustomers(c.data || [])
    setLoading(false)
  }, [business])

  useEffect(() => { loadData() }, [loadData])

  const filtered = bookings.filter((b) => {
    const matchSearch = !search ||
      b.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.service?.name?.toLowerCase().includes(search.toLowerCase()) ||
      b.staff?.name?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || b.status === statusFilter
    return matchSearch && matchStatus
  })

  const handleExport = () => {
    downloadCSV('bookings.csv', filtered.map((b) => ({
      customer: b.customer?.name || '',
      service: b.service?.name || '',
      staff: b.staff?.name || '',
      date: formatDate(b.start_time),
      time: formatTime(b.start_time),
      status: b.status,
      payment: b.payment_status,
      price: b.price,
    })))
  }

  const updateStatus = async (id: string, status: BookingStatus) => {
    await supabase.from('bookings').update({ status }).eq('id', id)
    loadData()
  }

  const deleteBooking = async (id: string) => {
    await supabase.from('bookings').delete().eq('id', id)
    loadData()
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
  }

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('bookings')}</h1>
        <div className="flex gap-2">
          <button onClick={handleExport} className="btn-secondary"><Download size={16} /> {t('export')}</button>
          <button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> {t('new_booking')}</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder={t('search')} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as BookingStatus | 'all')}>
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState icon={CalendarDays} title={t('no_bookings')} action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus size={16} /> {t('new_booking')}</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('customer')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('service')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden md:table-cell">{t('staff')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('date')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500">{t('status')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 hidden sm:table-cell">{t('price')}</th>
                  <th className="px-4 py-3 font-medium text-gray-500 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((b) => (
                  <tr key={b.id} className="table-row-hover">
                    <td className="px-4 py-3 font-medium">{b.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{b.service?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 hidden md:table-cell">{b.staff?.name || '—'}</td>
                    <td className="px-4 py-3">
                      <div>{formatDate(b.start_time)}</div>
                      <div className="text-xs text-gray-400">{formatTime(b.start_time)}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell">{formatCurrency(Number(b.price), business?.currency || 'USD')}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {b.status === 'pending' && (
                          <button onClick={() => updateStatus(b.id, 'confirmed')} className="btn-ghost p-1.5 text-accent-600" title="Confirm"><Check size={16} /></button>
                        )}
                        {b.status === 'confirmed' && (
                          <button onClick={() => updateStatus(b.id, 'completed')} className="btn-ghost p-1.5 text-primary-600" title="Complete"><Clock size={16} /></button>
                        )}
                        {b.status !== 'cancelled' && b.status !== 'completed' && (
                          <button onClick={() => updateStatus(b.id, 'cancelled')} className="btn-ghost p-1.5 text-error-600" title="Cancel"><XCircle size={16} /></button>
                        )}
                        <button onClick={() => setEditing(b)} className="btn-ghost p-1.5" title={t('edit')}><Edit size={16} /></button>
                        <button onClick={() => deleteBooking(b.id)} className="btn-ghost p-1.5 text-error-600" title={t('delete')}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(showCreate || editing) && (
        <BookingForm
          booking={editing}
          services={services}
          staffList={staffList}
          customers={customers}
          businessId={business!.id}
          onClose={() => { setShowCreate(false); setEditing(null) }}
          onSaved={() => { setShowCreate(false); setEditing(null); loadData() }}
        />
      )}
    </div>
  )
}

function BookingForm({
  booking, services, staffList, customers, businessId, onClose, onSaved,
}: {
  booking: Booking | null
  services: Service[]
  staffList: Staff[]
  customers: Customer[]
  businessId: string
  onClose: () => void
  onSaved: () => void
}) {
  const [serviceId, setServiceId] = useState(booking?.service_id || '')
  const [staffId, setStaffId] = useState(booking?.staff_id || '')
  const [customerId, setCustomerId] = useState(booking?.customer_id || '')
  const [date, setDate] = useState(booking ? booking.start_time.split('T')[0] : new Date().toISOString().split('T')[0])
  const [time, setTime] = useState(booking ? formatTime(booking.start_time).replace(/ /g, '') : '09:00')
  const [notes, setNotes] = useState(booking?.notes || '')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const service = services.find((s) => s.id === serviceId)
    if (!service) { setError('Select a service'); setSaving(false); return }

    const startTime = new Date(`${date}T${time.length === 4 ? '0' + time : time}:00`)
    const endTime = new Date(startTime.getTime() + service.duration_minutes * 60000)

    let custId = customerId
    if (!custId && newCustomerName) {
      const { data: newCust } = await supabase.from('customers').insert({
        business_id: businessId,
        name: newCustomerName,
      }).select().single()
      custId = newCust?.id ?? ''
    }
    if (!custId) { setError('Select or create a customer'); setSaving(false); return }

    const payload = {
      business_id: businessId,
      service_id: serviceId,
      staff_id: staffId,
      customer_id: custId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      price: service.price,
      notes,
      status: booking?.status || 'pending',
      payment_status: booking?.payment_status || 'unpaid',
    }

    if (booking) {
      await supabase.from('bookings').update(payload).eq('id', booking.id)
    } else {
      await supabase.from('bookings').insert(payload)
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={booking ? 'Edit Booking' : 'New Booking'} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">{'Service'}</label>
            <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)} required>
              <option value="">Select service...</option>
              {services.map((s) => <option key={s.id} value={s.id}>{s.name} — {formatCurrency(Number(s.price))} ({s.duration_minutes}min)</option>)}
            </select>
          </div>
          <div>
            <label className="label">{'Staff'}</label>
            <select className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)} required>
              <option value="">Select staff...</option>
              {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">{'Customer'}</label>
            <select className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">New customer...</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {!customerId && (
            <div>
              <label className="label">{'New Customer Name'}</label>
              <input className="input" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" />
            </div>
          )}
          <div>
            <label className="label">{'Date'}</label>
            <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="label">{'Time'}</label>
            <input type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">{'Notes'}</label>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        {error && <p className="text-sm text-error-600">{error}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}
