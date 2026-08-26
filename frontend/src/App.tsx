import { Routes, Route, Navigate } from "react-router-dom";

import PublicLayout from "./public-site/PublicLayout";
import HomePage from "./public-site/HomePage";
import ReservationFormPage from "./public-site/ReservationFormPage";
import ReservationCompletePage from "./public-site/ReservationCompletePage";
import ReservationLookupPage from "./public-site/ReservationLookupPage";

import { AdminSessionProvider } from "./admin/AdminSessionContext";
import AdminLoginPage from "./admin/AdminLoginPage";
import AdminLayout from "./admin/AdminLayout";
import AdminDashboardPage from "./admin/AdminDashboardPage";
import AdminReservationsPage from "./admin/AdminReservationsPage";
import AdminReservationDetailPage from "./admin/AdminReservationDetailPage";
import AdminReservationCreatePage from "./admin/AdminReservationCreatePage";
import AdminCalendarPage from "./admin/AdminCalendarPage";
import AdminSettingsPage from "./admin/AdminSettingsPage";
import AdminAuditLogPage from "./admin/AdminAuditLogPage";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/reserve" element={<ReservationFormPage />} />
        <Route path="/reserve/complete" element={<ReservationCompletePage />} />
        <Route path="/reserve/lookup" element={<ReservationLookupPage />} />
      </Route>

      <Route
        path="/admin/*"
        element={
          <AdminSessionProvider>
            <Routes>
              <Route path="login" element={<AdminLoginPage />} />
              <Route element={<AdminLayout />}>
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="calendar" element={<AdminCalendarPage />} />
                <Route path="reservations" element={<AdminReservationsPage />} />
                <Route path="reservations/new" element={<AdminReservationCreatePage />} />
                <Route path="reservations/:id" element={<AdminReservationDetailPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="audit-logs" element={<AdminAuditLogPage />} />
              </Route>
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </AdminSessionProvider>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
