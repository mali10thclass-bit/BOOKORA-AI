import { useEffect, useState } from 'react'
import { useParams } from '@/lib/router-compat'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatTime } from '@/lib/utils'
import type { Service, Staff, Business } from '@/types'
import { Calendar, Clock, Check, ChevronRight, Sparkles, User } from 'lucide-react'
import { format, addDays, isToday, isSameDay } from 'date-fns'

export function PublicBooking() {
  const { slug } = useParams<{ slug: string }>()
  const [loading, setLoading] = useState(true)
  const [business, setBusiness] = useState<Business | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [step, setStep] = useState(0)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [selectedTime, setSelectedTime] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: biz } = await supabase.from('businesses').select('*').eq('slug', slug || '').maybeSingle()
      if (!biz) { setLoading(false); return }
      setBusiness(biz as Business)
      const [s, st] = await Promise.all([
        supabase.from('services').select('*').eq('business_id', biz.id).eq('is_active', true),
        supabase.from('staff').select('*').eq('business_id', biz.id).eq('is_active', true),
      ])
      setServices(s.data || [])
      setStaffList(st.data || [])
      setLoading(false)
    }
    load()
  }, [slug])

  const timeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30']

  const handleConfirm = async () => {
    if (!business || !selectedService || !selectedStaff || !selectedTime) return
    if (!name) { setError('Please enter your name'); return }
    setBooking(true)
    setError(null)

    const startTime = new Date(selectedDate)
    const [h, m] = selectedTime.split(':')
    startTime.setHours(Number(h), Number(m), 0, 0)
    const endTime = new Date(startTime.getTime() + selectedService.duration_minutes * 60000)

    // Create customer
    const { data: customer } = await supabase.from('customers').insert({
      business_id: business.id,
      name,
      email: email || null,
      phone: phone || null,
    }).select().single()

    if (!customer) { setError('Failed to create customer'); setBooking(false); return }

    await supabase.from('bookings').insert({
      business_id: business.id,
      service_id: selectedService.id,
      staff_id: selectedStaff.id,
      customer_id: customer.id,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      price: selectedService.price,
      status: 'confirmed',
      payment_status: 'unpaid',
    })

    setBooking(false)
    setConfirmed(true)
  }

  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  if (!business) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium text-gray-600">Business not found</p>
        <p className="text-sm text-gray-400 mt-1">Check the booking link and try again.</p>
      </div>
    </div>
  )

  if (confirmed) return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      <div className="card p-8 max-w-md text-center">
        <div className="w-16 h-16 rounded-full bg-accent-100 dark:bg-accent-900/30 flex items-center justify-center mx-auto mb-4">
          <Check size={32} className="text-accent-600" />
        </div>
        <h2 className="text-xl font-bold">Booking Confirmed!</h2>
        <p className="text-sm text-gray-500 mt-2">
          {selectedService?.name} with {selectedStaff?.name} on {format(selectedDate, 'EEEE, MMMM d')} at {selectedTime}
        </p>
        <p className="text-xs text-gray-400 mt-4">We look forward to seeing you at {business.name}!</p>
      </div>
    </div>
  )

  const steps = ['Service', 'Staff', 'Time', 'Details']
  const nextDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i))

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold" style={{ backgroundColor: business.primary_color || '#2563eb' }}>
            {business.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-semibold">{business.name}</h1>
            <p className="text-xs text-gray-500">Book an appointment</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto p-4">
        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                i < step ? 'bg-accent-600 text-white' : i === step ? 'bg-primary-600 text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'
              }`}>
                {i < step ? <Check size={14} /> : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i === step ? 'font-medium' : 'text-gray-400'}`}>{s}</span>
              {i < 3 && <div className={`flex-1 h-0.5 mx-2 rounded ${i < step ? 'bg-accent-600' : 'bg-gray-200 dark:bg-gray-800'}`} />}
            </div>
          ))}
        </div>

        {/* Step 0: Service */}
        {step === 0 && (
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="text-center text-gray-400 py-12">No services available</p>
            ) : services.map((s) => (
              <button key={s.id} onClick={() => { setSelectedService(s); setStep(1) }} className="card w-full p-4 flex items-center justify-between hover:border-primary-300 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-10 rounded-full" style={{ backgroundColor: s.color || '#3b82f6' }} />
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-2"><Clock size={12} /> {s.duration_minutes} min · {formatCurrency(Number(s.price), business.currency || 'USD')}</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </button>
            ))}
          </div>
        )}

        {/* Step 1: Staff */}
        {step === 1 && (
          <div className="space-y-2">
            <button onClick={() => setStep(0)} className="text-sm text-gray-500 mb-2">← Back</button>
            {staffList.map((s) => (
              <button key={s.id} onClick={() => { setSelectedStaff(s); setStep(2) }} className="card w-full p-4 flex items-center gap-3 hover:border-primary-300 transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 font-medium">
                  {s.name.charAt(0)}
                </div>
                <div>
                  <p className="font-medium">{s.name}</p>
                  {s.bio && <p className="text-xs text-gray-500">{s.bio}</p>}
                </div>
                <ChevronRight size={18} className="text-gray-400 ml-auto" />
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Date & Time */}
        {step === 2 && (
          <div className="space-y-4">
            <button onClick={() => setStep(1)} className="text-sm text-gray-500">← Back</button>
            <div className="card p-4">
              <h3 className="font-medium text-sm mb-3">Select a date</h3>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {nextDays.map((d) => (
                  <button
                    key={d.toISOString()}
                    onClick={() => setSelectedDate(d)}
                    className={`shrink-0 w-16 py-2 rounded-lg text-center transition-colors ${
                      isSameDay(d, selectedDate)
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <p className="text-xs">{format(d, 'EEE')}</p>
                    <p className="font-bold">{format(d, 'd')}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="card p-4">
              <h3 className="font-medium text-sm mb-3">Available times — {format(selectedDate, 'MMM d')}</h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => { setSelectedTime(time); setStep(3) }}
                    className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTime === time
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Details */}
        {step === 3 && (
          <div className="space-y-4">
            <button onClick={() => setStep(2)} className="text-sm text-gray-500">← Back</button>
            <div className="card p-5 space-y-4">
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-sm">
                <p className="font-medium">{selectedService?.name}</p>
                <p className="text-gray-500">{selectedStaff?.name} · {format(selectedDate, 'MMM d, yyyy')} at {selectedTime}</p>
                <p className="font-medium mt-1">{formatCurrency(Number(selectedService?.price || 0), business.currency || 'USD')}</p>
              </div>
              <div><label className="label">Your Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              </div>
              {error && <p className="text-sm text-error-600">{error}</p>}
              <button onClick={handleConfirm} disabled={booking} className="btn-primary w-full">
                {booking ? 'Confirming...' : 'Confirm Booking'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
