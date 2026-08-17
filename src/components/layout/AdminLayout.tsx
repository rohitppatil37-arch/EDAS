import { Suspense, useState } from "react";
import { Link, Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  ArrowRightLeft,
  BarChart3,
  ClipboardCheck,
  ClipboardEdit,
  Fuel,
  Gauge,
  Home,
  ListChecks,
  LogOut,
  MapPin,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabaseClient";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubdivisions } from "@/lib/queries/masterData";
import { usePendingWorkLogCount } from "@/lib/queries/workLogValidation";
import { cn } from "@/lib/utils";

const VALIDATION_PATH = "/admin/validation";

const navItems = [
  { to: "/admin", label: "रिपोर्ट", shortLabel: "रिपोर्ट", icon: BarChart3, end: true },
  { to: VALIDATION_PATH, label: "पडताळणी", shortLabel: "पडताळणी", icon: ListChecks },
  { to: "/admin/deployments", label: "सयंत्र नियुक्ती", shortLabel: "नियुक्ती", icon: ArrowRightLeft },
  { to: "/admin/attendance", label: "हजेरी", shortLabel: "हजेरी", icon: ClipboardCheck },
  { to: "/admin/pending", label: "प्रलंबित रक्कम", shortLabel: "रक्कम", icon: Wallet },
  { to: "/admin/gps", label: "GPS", shortLabel: "GPS", icon: MapPin },
  { to: "/admin/machines", label: "सयंत्र क्षमता", shortLabel: "क्षमता", icon: Gauge },
  { to: "/admin/fuel-dashboard", label: "इंधन डॅशबोर्ड", shortLabel: "इंधन", icon: Fuel },
];

const quickLinks = [
  { to: "/", label: "मुख्य पृष्ठ", icon: Home },
  { to: "/form", label: "फॉर्म भरा", icon: ClipboardEdit },
  { to: "/dashboard", label: "प्रगती डॅशबोर्ड", icon: BarChart3 },
];

export function AdminLayout() {
  const { session, profile, loading } = useAuth();
  const { data: subdivisions } = useSubdivisions();
  const { data: pendingCount = 0 } = usePendingWorkLogCount(profile?.subdivision_id ?? null);
  const location = useLocation();
  const [logoutOpen, setLogoutOpen] = useState(false);

  if (loading) {
    return <div className="p-10 text-center text-muted-foreground">लोड होत आहे...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const subdivisionName = subdivisions?.find((s) => s.id === profile?.subdivision_id)?.name;
  const subdivisionLabel =
    profile?.role === "superadmin" ? "सर्व उपविभाग (Superadmin)" : (subdivisionName ?? "...");
  const currentTitle = navItems.find((i) => (i.end ? location.pathname === i.to : location.pathname.startsWith(i.to)))?.label ?? "Admin";

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <div className="min-h-dvh bg-background md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden md:sticky md:top-0 md:flex md:h-dvh md:w-64 md:shrink-0 md:flex-col md:self-start md:border-r md:bg-card">
        <div className="flex items-center gap-2.5 border-b px-5 py-4">
          <img src="/main-logo.png" alt="" className="h-9 w-9 shrink-0 rounded-full object-cover" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-primary">यांत्रिकी विभाग</p>
            <p className="truncate text-xs text-muted-foreground">मातीकाम माहिती प्रणाली</p>
          </div>
        </div>

        <div className="border-b px-5 py-3">
          <p className="text-xs font-medium text-muted-foreground">उपविभाग</p>
          <p className="text-sm font-semibold text-foreground">{subdivisionLabel}</p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent"
                )
              }
            >
              <item.icon className="size-4.5 shrink-0" />
              {item.label}
              {item.to === VALIDATION_PATH && pendingCount > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {pendingCount}
                </Badge>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t px-3 py-3">
          <p className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">इतर पेजेस</p>
          <div className="space-y-1">
            {quickLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <item.icon className="size-4 shrink-0" />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div className="border-t p-3">
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setLogoutOpen(true)}
          >
            <LogOut className="size-4.5" />
            लॉगआउट
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar — all sizes */}
        <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 md:hidden">
            <img src="/main-logo.png" alt="" className="h-8 w-8 shrink-0 rounded-full object-cover" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-primary">{currentTitle}</p>
              <p className="truncate text-xs leading-tight text-muted-foreground">{subdivisionLabel}</p>
            </div>
          </div>
          <h1 className="hidden text-lg font-bold text-foreground md:block">{currentTitle}</h1>
          <div className="flex items-center gap-1 md:hidden">
            <Button variant="ghost" size="icon" asChild aria-label="मुख्य पृष्ठ">
              <Link to="/">
                <Home className="size-5" />
              </Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setLogoutOpen(true)}
              aria-label="लॉगआउट"
            >
              <LogOut className="size-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 px-4 py-5 pb-24 md:px-6 md:py-6 md:pb-6">
          <div className="mx-auto w-full max-w-3xl">
            <Suspense
              fallback={<div className="p-10 text-center text-muted-foreground">लोड होत आहे...</div>}
            >
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 overflow-x-auto border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="grid grid-cols-8 min-w-160">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )
              }
            >
              <span className="relative">
                <item.icon className="size-5" />
                {item.to === VALIDATION_PATH && pendingCount > 0 && (
                  <span className="absolute -right-1.5 -top-1.5 flex size-3.5 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </span>
              {item.shortLabel}
            </NavLink>
          ))}
        </div>
      </nav>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>लॉगआउट करायचे आहे का?</AlertDialogTitle>
            <AlertDialogDescription>
              तुम्हाला या खात्यातून लॉगआउट करायचे आहे का?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>रद्द करा</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={logout}
            >
              लॉगआउट करा
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
