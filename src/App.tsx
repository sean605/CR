import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ContactsPage from './pages/contacts/ContactsPage';
import ContactDetailPage from './pages/contacts/ContactDetailPage';
import LeadsPage from './pages/leads/LeadsPage';
import LeadDetailPage from './pages/leads/LeadDetailPage';
import DealsPage from './pages/deals/DealsPage';
import DealDetailPage from './pages/deals/DealDetailPage';
import TasksPage from './pages/tasks/TasksPage';
import TeamPage from './pages/team/TeamPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import EmailTemplatesPage from './pages/email/EmailTemplatesPage';
import AutomationsPage from './pages/automations/AutomationsPage';
import SettingsPage from './pages/settings/SettingsPage';
import ToastContainer from './components/ui/ToastContainer';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const loadUser = useAuthStore((s) => s.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/contacts" element={<ContactsPage />} />
                  <Route path="/contacts/:id" element={<ContactDetailPage />} />
                  <Route path="/leads" element={<LeadsPage />} />
                  <Route path="/leads/:id" element={<LeadDetailPage />} />
                  <Route path="/deals" element={<DealsPage />} />
                  <Route path="/deals/:id" element={<DealDetailPage />} />
                  <Route path="/tasks" element={<TasksPage />} />
                  <Route path="/team" element={<TeamPage />} />
                  <Route path="/analytics" element={<AnalyticsPage />} />
                  <Route path="/email/templates" element={<EmailTemplatesPage />} />
                  <Route path="/automations" element={<AutomationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Routes>
              </AppLayout>
            </PrivateRoute>
          }
        />
      </Routes>
      <ToastContainer />
    </>
  );
}
