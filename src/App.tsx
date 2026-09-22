import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { AuthPage } from '@/pages/AuthPage'
import { AppLayout } from '@/components/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Bookings } from '@/pages/Bookings'
import { CalendarPage } from '@/pages/CalendarPage'
import { Customers } from '@/pages/Customers'
import { StaffPage } from '@/pages/StaffPage'
import { ServicesPage } from '@/pages/ServicesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { Analytics } from '@/pages/Analytics'
import { NotificationsPage } from '@/pages/NotificationsPage'
import { PlansPage } from '@/pages/PlansPage'
import { AIAssistant } from '@/pages/AIAssistant'
import { OnboardingWizard } from '@/pages/OnboardingWizard'
import { PublicBooking } from '@/pages/PublicBooking'
import { ProtectedRoute } from '@/components/ProtectedRoute'

export default function App() {
  const { loading, business } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/book/:slug" element={<PublicBooking />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            {business && !business.onboarding_completed ? (
              <OnboardingWizard />
            ) : (
              <AppLayout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/bookings" element={<Bookings />} />
                  <Route path="/calendar" element={<CalendarPage />} />
                  <Route path="/customers" element={<Customers />} />
                  <Route path="/staff" element={<StaffPage />} />
                  <Route path="/services" element={<ServicesPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/plans" element={<PlansPage />} />
                  <Route path="/ai-assistant" element={<AIAssistant />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </AppLayout>
            )}
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
