interface GovHeaderProps {
  title?: string;
  showSubtitle?: boolean;
}

export function GovHeader({
  title = "यांत्रिकी विभाग मातीकाम माहिती प्रणाली",
  showSubtitle = true,
}: GovHeaderProps) {
  return (
    <header className="mb-5 rounded-2xl border bg-card px-4 py-4 text-center shadow-sm sm:py-5">
      <div className="mb-2.5 flex items-center justify-center gap-4 sm:gap-6">
        <img src="/left-logo.png" alt="" className="h-11 w-auto sm:h-16" />
        <img src="/main-logo.png" alt="" className="h-14 w-auto sm:h-20" />
        <img src="/right-logo.png" alt="" className="h-11 w-auto sm:h-16" />
      </div>
      {showSubtitle && (
        <p className="mb-1 text-xs font-medium text-muted-foreground sm:text-sm">
          मा. कार्यकारी अभियंता यांत्रिकी विभाग (को.प्र), अलोरे अंतर्गत
        </p>
      )}
      <h1 className="text-lg font-bold text-primary sm:text-2xl">{title}</h1>
    </header>
  );
}
