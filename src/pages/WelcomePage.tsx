import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, ClipboardEdit, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { ProjectProgressSection } from "@/components/home/ProjectProgressSection";

export function WelcomePage() {
  const { session } = useAuth();

  const navItems = [
    {
      to: "/dashboard",
      label: "मातीकाम प्रगती Dashboard",
      description: "इंधन कार्यक्षमता व प्रगतीचा अहवाल पहा",
      icon: BarChart3,
      primary: false,
    },
    {
      to: "/form",
      label: "माहिती भरण्याकरिता येथे क्लिक करा",
      description: "चालक / ऑपरेटरसाठी दैनंदिन नोंद",
      icon: ClipboardEdit,
      primary: true,
    },
    session
      ? {
          to: "/admin",
          label: "Admin Dashboard",
          description: "प्रशासकीय अहवाल व नोंदी व्यवस्थापन",
          icon: ShieldCheck,
          primary: false,
        }
      : {
          to: "/login",
          label: "Admin Login",
          description: "प्रशासकीय अहवाल व नोंदी व्यवस्थापन",
          icon: ShieldCheck,
          primary: false,
        },
  ];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="relative shrink-0 overflow-hidden border-b bg-linear-to-b from-primary/[0.07] via-primary/2 to-transparent">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-24 flex justify-center"
        >
          <div className="size-56 rounded-full bg-primary/10 blur-3xl sm:size-72" />
        </div>

        <div className="relative mx-auto max-w-3xl px-4 py-4 sm:py-6">
          <header className="mb-3 text-center sm:mb-4">
            <div className="mb-3 flex items-center justify-center gap-4 sm:gap-6">
              <img src="/left-logo.png" alt="" className="h-10 w-auto sm:h-14" />
              <img src="/main-logo.png" alt="" className="h-12 w-auto sm:h-16" />
              <img src="/right-logo.png" alt="" className="h-10 w-auto sm:h-14" />
            </div>
            <p className="mb-1 text-[11px] font-semibold tracking-wide text-muted-foreground sm:text-xs">
              महाराष्ट्र शासन
            </p>
            <h1 className="text-balance text-base leading-snug font-bold text-primary sm:text-xl">
              मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे आपले स्वागत आहे
            </h1>
            <p className="mt-1.5 text-xs text-muted-foreground sm:text-sm">
              यांत्रिकी विभाग मातीकाम माहिती व्यवस्थापन प्रणाली
            </p>
          </header>

          <nav
            aria-label="मुख्य नेव्हिगेशन"
            className="flex flex-col gap-2 rounded-xl border bg-card/70 p-2 shadow-sm backdrop-blur-sm sm:flex-row sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none"
          >
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 transition-all sm:flex-1 sm:flex-col sm:gap-2 sm:py-4 sm:text-center",
                  "active:scale-[0.98]",
                  item.primary
                    ? "border-primary/20 bg-primary text-primary-foreground shadow-md hover:shadow-lg"
                    : "border-border bg-card hover:border-primary/30 hover:bg-accent hover:shadow-sm"
                )}
              >
                <span
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full sm:size-9",
                    item.primary ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
                  )}
                >
                  <item.icon className="size-4 sm:size-4.5" />
                </span>

                <span className="min-w-0 flex-1 sm:flex-none">
                  <span className="block text-sm leading-tight font-semibold sm:text-base">
                    {item.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block text-[11px] sm:text-xs",
                      item.primary ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {item.description}
                  </span>
                </span>

                <ArrowRight
                  className={cn(
                    "size-4 shrink-0 opacity-40 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100 sm:hidden",
                    item.primary && "opacity-70"
                  )}
                />
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col justify-center px-4 py-3 sm:py-4">
        <ProjectProgressSection />
      </div>
    </div>
  );
}
