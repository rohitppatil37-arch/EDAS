import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";

const WorkLogEntryPage = lazy(() =>
  import("@/pages/WorkLogEntryPage").then((m) => ({ default: m.WorkLogEntryPage }))
);
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const FuelDashboardPage = lazy(() =>
  import("@/pages/FuelDashboardPage").then((m) => ({ default: m.FuelDashboardPage }))
);
const AdminDashboardPage = lazy(() =>
  import("@/pages/AdminDashboardPage").then((m) => ({ default: m.AdminDashboardPage }))
);
const AttendanceEntryPage = lazy(() =>
  import("@/pages/AttendanceEntryPage").then((m) => ({ default: m.AttendanceEntryPage }))
);
const PendingPaymentsPage = lazy(() =>
  import("@/pages/PendingPaymentsPage").then((m) => ({ default: m.PendingPaymentsPage }))
);
const GpsLogEntryPage = lazy(() =>
  import("@/pages/GpsLogEntryPage").then((m) => ({ default: m.GpsLogEntryPage }))
);

function PageFallback() {
  return <div className="p-10 text-center text-muted-foreground">लोड होत आहे...</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<WorkLogEntryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<FuelDashboardPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="attendance" element={<AttendanceEntryPage />} />
            <Route path="pending" element={<PendingPaymentsPage />} />
            <Route path="gps" element={<GpsLogEntryPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
