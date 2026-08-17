import { useEffect, useState } from "react";
import { TrendingUp, Waves } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useProjects } from "@/lib/queries/masterData";
import { useProjectVolumes } from "@/lib/queries/projectProgress";

const FEATURED_PROJECT_NAMES = [
  "वाशिष्ठी नदीतील गाळ काढणे ता. चिपळूण (टप्पा-१)",
  "जगबुडी नदी ता.खेड जि.रत्नागिरी येथील गाळ व बेटे काढणे",
  "गड नदीतील गाळ व झाडेझुडुपे काढणे, आरवली, ता. संगमेश्वर",
  "वाशिष्ठी नदीतील गाळ काढणे ता. चिपळूण (टप्पा-२)",
];

const ACCENT_CLASSES = [
  "bg-chart-1/10 text-chart-1",
  "bg-chart-2/10 text-chart-2",
  "bg-chart-3/10 text-chart-3",
  "bg-chart-4/10 text-chart-4",
];

function volumeFmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
}

// Animates a number counting up from 0 to `target` — used for both the big stat
// numbers and to drive the Progress bar's fill so both animate together.
function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (target <= 0) {
      setValue(0);
      return;
    }
    let raf = 0;
    const start = performance.now();

    function tick(now: number) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

function ProjectProgressCard({
  name,
  volume,
  sharePct,
  index,
}: {
  name: string;
  volume: number;
  sharePct: number;
  index: number;
}) {
  const animatedVolume = useCountUp(volume);
  const animatedShare = useCountUp(sharePct);

  return (
    <Card
      className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both gap-2.5 py-3.5 transition-shadow duration-500 hover:shadow-md sm:py-4"
      style={{ animationDelay: `${index * 90}ms` }}
    >
      <CardContent className="space-y-2 px-4">
        <div className="flex items-start gap-2">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${ACCENT_CLASSES[index % ACCENT_CLASSES.length]}`}
          >
            <Waves className="size-3.5" />
          </span>
          <p className="line-clamp-3 text-xs leading-snug font-semibold text-foreground sm:text-sm">
            {name}
          </p>
        </div>

        <p className="text-xl font-bold tabular-nums text-primary sm:text-2xl">
          {volumeFmt(animatedVolume)} <span className="text-xs font-semibold sm:text-sm">घ.मी.</span>
        </p>

        <div className="space-y-1">
          <Progress value={animatedShare} className="h-2" />
          <p className="text-right text-[10px] text-muted-foreground sm:text-xs">
            एकूण कामापैकी वाटा {animatedShare.toFixed(0)}%
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProjectProgressSection() {
  const { data: projects = [] } = useProjects();

  // Some project names have more than one row in `projects` (duplicate master-data
  // entries under different subdivisions) — match ALL of them per featured name and
  // sum their volumes, so the card is correct regardless of which duplicate a naive
  // single-match would have picked.
  const featuredGroups = FEATURED_PROJECT_NAMES.map((name) => ({
    name,
    ids: projects.filter((p) => p.project_name === name).map((p) => p.id),
  })).filter((g) => g.ids.length > 0);

  const allProjectIds = featuredGroups.flatMap((g) => g.ids);
  const volumeQueries = useProjectVolumes(allProjectIds);
  const allLoaded = allProjectIds.length > 0 && volumeQueries.every((q) => q.data !== undefined);

  const volumeById = new Map(allProjectIds.map((id, i) => [id, volumeQueries[i]?.data ?? 0]));
  const volumes = featuredGroups.map((g) => ({
    id: g.ids[0],
    name: g.name,
    volume: g.ids.reduce((sum, id) => sum + (volumeById.get(id) ?? 0), 0),
  }));

  const totalVolume = volumes.reduce((sum, v) => sum + v.volume, 0);
  const animatedTotal = useCountUp(totalVolume);

  if (!allLoaded) return null;

  return (
    <section className="min-h-0 shrink-0">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground sm:text-base">प्रकल्प प्रगती अहवाल</h2>
          <span className="flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            थेट
          </span>
        </div>
        <p className="text-sm font-bold tabular-nums text-primary sm:text-base">
          एकूण गाळ काढणी: {volumeFmt(animatedTotal)} घ.मी.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {volumes.map((v, i) => (
          <ProjectProgressCard
            key={v.id}
            name={v.name}
            volume={v.volume}
            sharePct={totalVolume > 0 ? (v.volume / totalVolume) * 100 : 0}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
