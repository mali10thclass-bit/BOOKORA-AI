import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { useI18n } from '@/context/I18nContext'
import { EmptyState } from '@/components/EmptyState'
import { Modal } from '@/components/Modal'
import type { Staff, WorkingHour, UserRole } from '@/types'
import { UserCog, Plus, Edit, Trash2, Clock, Mail, Phone } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function StaffPage() {
  const { business } = useAuth()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [staffList, setStaffList] = useState<Staff[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Staff | null>(null)
  const [scheduleStaff, setScheduleStaff] = useState<Staff | null>(null)
  const [workingHours, setWorkingHours] = useState<WorkingHour[]>([])

  const load = useCallback(async () => {
    if (!business) return
    const { data } = await supabase.from('staff').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
    setStaffList(data || [])
    setLoading(false)
  }, [business])

  useEffect(() => { load() }, [load])

  const deleteStaff = async (id: string) => {
    await supabase.from('staff').delete().eq('id', id)
    load()
  }

  const openSchedule = async (s: Staff) => {
    setScheduleStaff(s)
    const { data } = await supabase.from('working_hours').select('*').eq('staff_id', s.id)
    setWorkingHours(data || [])
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">{t('staff')}</h1>
        <button onClick={() => { setEditing(null); setShowForm(true) }} className="btn-primary"><Plus size={16} /> {t('add_staff')}</button>
      </div>

      {staffList.length === 0 ? (
        <div className="card">
          <EmptyState icon={UserCog} title="No staff members yet" action={<button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> {t('add_staff')}</button>} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((s) => (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-medium">
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <span className="badge bg-gray-100 dark:bg-gray-800 capitalize text-xs">{s.role}</span>
                  </div>
                </div>
              </div>
              <div className="mt-3 space-y-1 text-xs text-gray-500">
                {s.email && <p className="flex items-center gap-1"><Mail size={12} /> {s.email}</p>}
                {s.phone && <p className="flex items-center gap-1"><Phone size={12} /> {s.phone}</p>}
              </div>
              <div className="mt-3 flex items-center gap-1">
                <button onClick={() => openSchedule(s)} className="btn-ghost text-sm flex items-center gap-1"><Clock size={14} /> Hours</button>
                <button onClick={() => { setEditing(s); setShowForm(true) }} className="btn-ghost p-1.5"><Edit size={16} /></button>
                <button onClick={() => deleteStaff(s.id)} className="btn-ghost p-1.5 text-error-600"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(showForm || editing) && (
        <StaffForm staff={editing} businessId={business!.id} onClose={() => { setShowForm(false); setEditing(null) }} onSaved={() => { setShowForm(false); setEditing(null); load() }} />
      )}

      {scheduleStaff && (
        <ScheduleModal staff={scheduleStaff} workingHours={workingHours} onClose={() => setScheduleStaff(null)} />
      )}
    </div>
  )
}

function StaffForm({ staff, businessId, onClose, onSaved }: { staff: Staff | null; businessId: string; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(staff?.name || '')
  const [email, setEmail] = useState(staff?.email || '')
  const [phone, setPhone] = useState(staff?.phone || '')
  const [role, setRole] = useState<UserRole>((staff?.role as UserRole) || 'staff')
  const [bio, setBio] = useState(staff?.bio || '')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = { business_id: businessId, name, email: email || null, phone: phone || null, role, bio: bio || null }
    if (staff) {
      await supabase.from('staff').update(payload).eq('id', staff.id)
    } else {
      const { data } = await supabase.from('staff').insert(payload).select().single()
      if (data) {
        const defaultHours = DAYS.map((_, i) => ({
          staff_id: data.id,
          day_of_week: i,
          start_time: '09:00',
          end_time: '17:00',
          is_working: i >= 1 && i <= 5,
        }))
        await supabase.from('working_hours').insert(defaultHours)
      }
    }
    setSaving(false)
    onSaved()
  }

  return (
    <Modal open onClose={onClose} title={staff ? 'Edit Staff' : 'Add Staff'} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Name</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} required /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div><label className="label">Phone</label><input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            <option value="staff">Staff</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div><label className="label">Bio</label><textarea className="input" rows={2} value={bio} onChange={(e) => setBio(e.target.value)} /></div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  )
}

function ScheduleModal({ staff, workingHours, onClose }: { staff: Staff; workingHours: WorkingHour[]; onClose: () => void }) {
  const [hours, setHours] = useState<WorkingHour[]>(workingHours.length === 7 ? workingHours : DAYS.map((_, i) => ({ id: '', staff_id: staff.id, day_of_week: i, start_time: '09:00', end_time: '17:00', is_working: i >= 1 && i <= 5 })))
  const [saving, setSaving] = useState(false)

  const toggle = (idx: number) => {
    setHours(h => h.map((h, i) => i === idx ? { ...h, is_working: !h.is_working } : h))
  }

  const update = (idx: number, field: 'start_time' | 'end_time', value: string) => {
    setHours(h => h.map((h, i) => i === idx ? { ...h, [field]: value } : h))
  }

  const save = async () => {
    setSaving(true)
    await supabase.from('working_hours').delete().eq('staff_id', staff.id)
    await supabase.from('working_hours').insert(hours.map(({ staff_id, day_of_week, start_time, end_time, is_working }) => ({ staff_id, day_of_week, start_time, end_time, is_working })))
    setSaving(false)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={`${staff.name} — Working Hours`} size="md">
      <div className="space-y-2">
        {DAYS.map((day, i) => (
          <div key={day} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50">
            <label className="flex items-center gap-2 w-28 cursor-pointer">
              <input type="checkbox" checked={hours[i]?.is_working ?? false} onChange={() => toggle(i)} className="rounded" />
              <span className="text-sm font-medium">{day}</span>
            </label>
            {hours[i]?.is_working ? (
              <div className="flex items-center gap-2">
                <input type="time" className="input w-28" value={hours[i].start_time} onChange={(e) => update(i, 'start_time', e.target.value)} />
                <span className="text-gray-400">—</span>
                <input type="time" className="input w-28" value={hours[i].end_time} onChange={(e) => update(i, 'end_time', e.target.value)} />
              </div>
            ) : (
              <span className="text-sm text-gray-400">Off</span>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={save} disabled={saving} className="btn-primary">{saving ? 'Saving...' : 'Save'}</button>
      </div>
    </Modal>
  )
}
