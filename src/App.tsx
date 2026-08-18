import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useMachinesRealtimeSync } from "@/hooks/useMachinesRealtimeSync";

const WelcomePage = lazy(() => import("@/pages/WelcomePage").then((m) => ({ default: m.WelcomePage })));
const WorkLogEntryPage = lazy(() =>
  import("@/pages/WorkLogEntryPage").then((m) => ({ default: m.WorkLogEntryPage }))
);
const LoginPage = lazy(() => import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage })));
const ProgressDashboardPage = lazy(() =>
  import("@/pages/ProgressDashboardPage").then((m) => ({ default: m.ProgressDashboardPage }))
);
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
const GpsReadingEntryPage = lazy(() =>
  import("@/pages/GpsReadingEntryPage").then((m) => ({ default: m.GpsReadingEntryPage }))
);
const MachineCapacityPage = lazy(() =>
  import("@/pages/MachineCapacityPage").then((m) => ({ default: m.MachineCapacityPage }))
);
const WorkLogValidationPage = lazy(() =>
  import("@/pages/WorkLogValidationPage").then((m) => ({ default: m.WorkLogValidationPage }))
);
const MachineDeploymentPage = lazy(() =>
  import("@/pages/MachineDeploymentPage").then((m) => ({ default: m.MachineDeploymentPage }))
);
const MachineTransferPage = lazy(() =>
  import("@/pages/MachineTransferPage").then((m) => ({ default: m.MachineTransferPage }))
);

function PageFallback() {
  return <div className="p-10 text-center text-muted-foreground">लोड होत आहे...</div>;
}

export default function App() {
  useMachinesRealtimeSync();

  return (
    <BrowserRouter>
      <Toaster position="top-center" richColors />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<WelcomePage />} />
          <Route path="/form" element={<WorkLogEntryPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<ProgressDashboardPage />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="validation" element={<WorkLogValidationPage />} />
            <Route path="deployments" element={<MachineDeploymentPage />} />
            <Route path="machine-transfer" element={<MachineTransferPage />} />
            <Route path="attendance" element={<AttendanceEntryPage />} />
            <Route path="pending" element={<PendingPaymentsPage />} />
            <Route path="gps" element={<GpsReadingEntryPage />} />
            <Route path="machines" element={<MachineCapacityPage />} />
            <Route path="fuel-dashboard" element={<FuelDashboardPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
