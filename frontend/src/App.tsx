import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentPage from './pages/EquipmentPage';
import EquipmentFormPage from './pages/EquipmentFormPage';
import EquipmentDetailsPage from './pages/EquipmentDetailsPage';
import EmployeesPage from './pages/EmployeesPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import IssuancesPage from './pages/IssuancesPage';
import BackupPage from './pages/BackupPage';
import RepairsPage from './pages/RepairsPage';
import InventoryChecksPage from './pages/InventoryChecksPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AboutProjectPage from './pages/AboutProjectPage';
import ProfilePage from './pages/ProfilePage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<DashboardPage />} />
              <Route path="/equipment" element={<EquipmentPage />} />
              <Route path="/equipment/new" element={<EquipmentFormPage />} />
              <Route path="/equipment/:id" element={<EquipmentDetailsPage />} />
              <Route path="/equipment/:id/edit" element={<EquipmentFormPage />} />
              <Route path="/employees" element={<EmployeesPage />} />
              <Route path="/employees/new" element={<EmployeeFormPage />} />
              <Route path="/employees/:id/edit" element={<EmployeeFormPage />} />
              <Route path="/issuances" element={<IssuancesPage />} />
              <Route path="/repairs" element={<RepairsPage />} />
              <Route path="/inventory-checks" element={<InventoryChecksPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/about" element={<AboutProjectPage />} />
              <Route path="/audit-log" element={
                <ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}>
                  <AuditLogPage />
                </ProtectedRoute>
              } />
              <Route path="/admin/users" element={
                <ProtectedRoute requireAdmin>
                  <AdminUsersPage />
                </ProtectedRoute>
              } />
              <Route path="/backup" element={
                <ProtectedRoute requireAdmin>
                  <BackupPage />
                </ProtectedRoute>
              } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
