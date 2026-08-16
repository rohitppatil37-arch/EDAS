import { Link } from "react-router-dom";
import { ArrowRight, BarChart3, ClipboardEdit, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

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
    <div className="relative min-h-dvh overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 flex justify-center"
      >
        <div className="size-72 rounded-full bg-primary/10 blur-3xl sm:size-96" />
      </div>

      <div className="relative mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4 py-10 sm:py-16">
        <header className="mb-9 text-center">
          <div className="mb-5 flex items-center justify-center gap-5 sm:gap-8">
            <img src="/left-logo.png" alt="" className="h-14 w-auto sm:h-20" />
            <img src="/main-logo.png" alt="" className="h-16 w-auto sm:h-24" />
            <img src="/right-logo.png" alt="" className="h-14 w-auto sm:h-20" />
          </div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground sm:text-sm">
            महाराष्ट्र शासन
          </p>
          <h1 className="text-balance text-xl leading-snug font-bold text-primary sm:text-3xl">
            मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे आपले स्वागत आहे
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            यांत्रिकी विभाग मातीकाम माहिती व्यवस्थापन प्रणाली
          </p>
        </header>

        <nav
          aria-label="मुख्य नेव्हिगेशन"
          className="flex flex-col gap-2.5 rounded-2xl border bg-card/70 p-2.5 shadow-sm backdrop-blur-sm sm:flex-row sm:border-none sm:bg-transparent sm:p-0 sm:shadow-none"
        >
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "group flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-all sm:flex-1 sm:flex-col sm:gap-2.5 sm:py-7 sm:text-center",
                "active:scale-[0.98]",
                item.primary
                  ? "border-primary/20 bg-primary text-primary-foreground shadow-md hover:shadow-lg"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent hover:shadow-sm"
              )}
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12",
                  item.primary ? "bg-primary-foreground/15" : "bg-primary/10 text-primary"
                )}
              >
                <item.icon className="size-5 sm:size-6" />
              </span>

              <span className="min-w-0 flex-1 sm:flex-none">
                <span className="block text-sm leading-tight font-semibold sm:text-base">
                  {item.label}
                </span>
                <span
                  className={cn(
                    "mt-0.5 block text-xs sm:text-sm",
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
  );
}
