import { useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Fuel,
  Gauge,
  Home,
  LayoutDashboard,
  Loader2,
  RotateCcw,
  Timer,
  Truck,
  Wrench,
} from "lucide-react";
import { GovHeader } from "@/components/layout/GovHeader";
import { SelectField } from "@/components/form/SelectField";
import { TextField } from "@/components/form/TextField";
import { MicInput } from "@/components/form/MicInput";
import { ErrorSummary } from "@/components/form/ErrorSummary";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useSubdivisions, useMachines, useStaff, useProjects } from "@/lib/queries/masterData";
import { fetchPreviousReading, useSubmitWorkLog } from "@/lib/queries/workLogs";
import {
  workLogSchema,
  calcTotalReading,
  calcShiftHours,
  type WorkLogFormValues,
} from "@/lib/workLogSchema";
import type { WorkLogInsert } from "@/types/database";

function unique(arr: string[]) {
  return [...new Set(arr)];
}

function todayIso() {
  return new Date().toISOString().split("T")[0];
}

const emptyValues: WorkLogFormValues = {
  workDate: todayIso(),
  subdivisionId: "",
  workType: "",
  projectId: "",
  machineType: "",
  machineId: "",
  machineCategory: "",
  staffId: "",
  dieselQty: "",
  dieselTime: "",
  dieselReading: "",
  startReading: "",
  endReading: "",
  shift1Start: "",
  shift1End: "",
  shift2Start: "",
  shift2End: "",
  tripCount: "",
  locationFromTo: "",
};

function SectionHeader({ icon: Icon, title }: { icon: typeof CalendarDays; title: string }) {
  return (
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-primary">
        <Icon className="size-4.5" />
        {title}
      </CardTitle>
    </CardHeader>
  );
}

function ComputedStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number | null;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border bg-accent/60 px-3 py-2.5">
      <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Icon className="size-4 shrink-0" />
        {label}
      </span>
      <span className="text-lg font-bold text-primary">{value === null || value === "" ? "-" : value}</span>
    </div>
  );
}

export function WorkLogEntryPage() {
  const navigate = useNavigate();
  const { data: subdivisions = [] } = useSubdivisions();
  const { data: machines = [] } = useMachines();
  const { data: staff = [] } = useStaff();
  const { data: projects = [] } = useProjects();
  const submitWorkLog = useSubmitWorkLog();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<WorkLogFormValues>({
    resolver: zodResolver(workLogSchema),
    defaultValues: emptyValues,
  });

  const subdivisionId = watch("subdivisionId");
  const workType = watch("workType");
  const machineType = watch("machineType");
  const machineId = watch("machineId");
  const dieselQty = watch("dieselQty");
  const startReading = watch("startReading");
  const endReading = watch("endReading");
  const shift1Start = watch("shift1Start");
  const shift1End = watch("shift1End");
  const shift2Start = watch("shift2Start");
  const shift2End = watch("shift2End");
  const machineCategory = watch("machineCategory");

  const workTypeOptions = useMemo(
    () =>
      unique(projects.filter((p) => p.subdivision_id === subdivisionId).map((p) => p.work_type)).map(
        (t) => ({ value: t, label: t })
      ),
    [projects, subdivisionId]
  );

  const projectOptions = useMemo(
    () =>
      projects
        .filter((p) => p.subdivision_id === subdivisionId && p.work_type === workType)
        .map((p) => ({ value: p.id, label: p.project_name })),
    [projects, subdivisionId, workType]
  );

  const machineTypeOptions = useMemo(
    () =>
      unique(machines.filter((m) => m.subdivision_id === subdivisionId).map((m) => m.machine_type)).map(
        (t) => ({ value: t, label: t })
      ),
    [machines, subdivisionId]
  );

  const machineOptions = useMemo(
    () =>
      machines
        .filter((m) => m.subdivision_id === subdivisionId && m.machine_type === machineType)
        .map((m) => ({ value: m.id, label: m.machine_name })),
    [machines, subdivisionId, machineType]
  );

  const selectedMachine = useMemo(() => machines.find((m) => m.id === machineId), [machines, machineId]);

  const staffOptions = useMemo(() => {
    if (!selectedMachine) return [];
    const roleRequired = selectedMachine.category === "Machine" ? "Operator" : "Driver";
    return staff
      .filter((s) => s.subdivision_id === subdivisionId && s.role === roleRequired)
      .map((s) => ({ value: s.id, label: s.name }));
  }, [staff, subdivisionId, selectedMachine]);

  const isVehicle = machineCategory === "Vehicle";

  // Reset dependent fields whenever an upstream selection changes.
  useEffect(() => {
    setValue("workType", "");
    setValue("projectId", "");
    setValue("machineType", "");
    setValue("machineId", "");
    setValue("machineCategory", "");
    setValue("staffId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subdivisionId]);

  useEffect(() => {
    setValue("projectId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workType]);

  useEffect(() => {
    setValue("machineId", "");
    setValue("machineCategory", "");
    setValue("staffId", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineType]);

  useEffect(() => {
    setValue("staffId", "");
    setValue("machineCategory", selectedMachine?.category ?? "");
    if (selectedMachine?.category !== "Vehicle") {
      setValue("tripCount", "");
      setValue("locationFromTo", "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machineId]);

  const dieselActive = Number(dieselQty) > 0;
  const totalReading = calcTotalReading(startReading, endReading);
  const totalShiftHours = calcShiftHours(shift1Start, shift1End, shift2Start, shift2End);

  async function onSubmit(data: WorkLogFormValues) {
    const start = Number(data.startReading);
    const end = Number(data.endReading);
    const total = end - start;
    const diesel = Number(data.dieselQty);

    try {
      const prevReading = await fetchPreviousReading(data.machineId, data.workDate);
      if (prevReading != null && Math.abs(start - prevReading) > 0.001) {
        toast.error('रिडींग जुळत नाही! कृपया "काम सुरू करतानाचे डॅशबोर्ड रिडींग" पुन्हा तपासा.');
        return;
      }
    } catch {
      toast.error("मागील रिडींग तपासताना समस्या आली. पुन्हा प्रयत्न करा.");
      return;
    }

    let remark = "✅ काम झाले";
    if (total === 0 && diesel === 0) remark = "🚫 काम झाले नाही";
    else if (total > 0 && diesel === 0) remark = "⚠️ काम झाले पण डिझेल भरले नाही";

    const payload: WorkLogInsert = {
      subdivision_id: data.subdivisionId,
      work_date: data.workDate,
      work_type: data.workType,
      project_id: data.projectId,
      machine_id: data.machineId,
      staff_id: data.staffId,
      diesel_qty: diesel,
      diesel_time: data.dieselTime || null,
      diesel_reading: data.dieselReading ? Number(data.dieselReading) : null,
      start_reading: start,
      end_reading: end,
      shift1_start: data.shift1Start || null,
      shift1_end: data.shift1End || null,
      shift2_start: data.shift2Start || null,
      shift2_end: data.shift2End || null,
      total_shift_hours: calcShiftHours(data.shift1Start, data.shift1End, data.shift2Start, data.shift2End),
      trip_count: data.tripCount ? Number(data.tripCount) : null,
      location_from_to: data.locationFromTo || null,
      remark,
    };

    try {
      await submitWorkLog.mutateAsync(payload);
      toast.success("माहिती यशस्वीरित्या जतन झाली!");
      reset({ ...emptyValues, workDate: todayIso() });
    } catch {
      toast.error("Server शी संपर्क होऊ शकला नाही. पुन्हा प्रयत्न करा.");
    }
  }

  function onInvalid() {
    toast.error("खालील माहिती भरणे आवश्यक आहे");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 pb-10">
      <GovHeader />

      <Alert className="mb-5 border-warning/40 bg-warning/10 [&>svg]:text-warning">
        <AlertTriangle />
        <AlertDescription className="font-medium text-foreground">
          सर्व माहिती मराठीत नीट तपासून भरावी.
        </AlertDescription>
      </Alert>

      <ErrorSummary errors={errors} />

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-4" noValidate>
        <Card>
          <SectionHeader icon={CalendarDays} title="मूलभूत माहिती" />
          <CardContent className="space-y-4">
            <TextField
              label="आजचा दिनांक"
              id="workDate"
              type="date"
              register={register("workDate")}
              error={errors.workDate?.message}
            />

            <SelectField
              control={control}
              name="subdivisionId"
              label="उपविभाग"
              placeholder="उपविभाग निवडा..."
              options={subdivisions.map((s) => ({ value: s.id, label: s.name }))}
              error={errors.subdivisionId?.message}
            />

            <SelectField
              control={control}
              name="workType"
              label="कामाचा प्रकार"
              placeholder="कामाचा प्रकार निवडा..."
              options={workTypeOptions}
              disabled={!subdivisionId}
              error={errors.workType?.message}
            />

            <SelectField
              control={control}
              name="projectId"
              label="प्रकल्पाचे नाव"
              placeholder="प्रकल्पाचे नाव निवडा..."
              options={projectOptions}
              disabled={!workType}
              error={errors.projectId?.message}
            />
          </CardContent>
        </Card>

        <Card>
          <SectionHeader icon={Wrench} title="सयंत्र व चालक" />
          <CardContent className="space-y-4">
            <SelectField
              control={control}
              name="machineType"
              label="सयंत्राचा प्रकार"
              placeholder="सयंत्राचा प्रकार निवडा..."
              options={machineTypeOptions}
              disabled={!subdivisionId}
              error={errors.machineType?.message}
            />

            <div className="space-y-1.5">
              <SelectField
                control={control}
                name="machineId"
                label="सयंत्राचे नाव"
                placeholder="सयंत्र निवडा..."
                options={machineOptions}
                disabled={!machineType}
                error={errors.machineId?.message}
              />
              {selectedMachine && (
                <Badge variant="secondary">
                  {selectedMachine.category === "Vehicle" ? "वाहन" : "मशीन"}
                </Badge>
              )}
            </div>

            <SelectField
              control={control}
              name="staffId"
              label="चालकाचे नाव"
              placeholder="चालक निवडा..."
              options={staffOptions}
              disabled={!machineId}
              error={errors.staffId?.message}
            />
          </CardContent>
        </Card>

        <Card>
          <SectionHeader icon={Fuel} title="इंधन तपशील" />
          <CardContent className="space-y-4">
            <TextField
              label="आज किती डिझेल भरले (लिटर)"
              id="dieselQty"
              type="number"
              step="0.1"
              min={0}
              placeholder="उदा. 25.5"
              register={register("dieselQty")}
              error={errors.dieselQty?.message}
            />

            <TextField
              label="डिझेल भरण्याची वेळ"
              id="dieselTime"
              type="time"
              register={register("dieselTime")}
              error={errors.dieselTime?.message}
              disabled={!dieselActive}
            />

            <TextField
              label="डिझेल भरण्यावेळी डॅशबोर्ड रिडींग"
              id="dieselReading"
              type="number"
              register={register("dieselReading")}
              error={errors.dieselReading?.message}
              disabled={!dieselActive}
            />

            {!dieselActive && (
              <p className="text-xs text-muted-foreground">
                * डिझेलचे प्रमाण भरल्यानंतर वेळ व रिडींग भरता येईल.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <SectionHeader icon={Gauge} title="सयंत्र रिडींग" />
          <CardContent className="space-y-4">
            <TextField
              label="काम सुरू करतानाचे डॅशबोर्ड रिडींग"
              id="startReading"
              type="number"
              min={0}
              register={register("startReading")}
              error={errors.startReading?.message}
            />

            <TextField
              label="काम थांबवतानाचे डॅशबोर्ड रिडींग"
              id="endReading"
              type="number"
              min={0}
              register={register("endReading")}
              error={errors.endReading?.message}
            />

            <ComputedStat icon={Gauge} label="आजचे एकूण तास / किमी" value={totalReading} />
          </CardContent>
        </Card>

        <Card>
          <SectionHeader icon={Clock} title="शिफ्ट वेळापत्रक" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="शिफ्ट-१ सुरू वेळ"
                id="shift1Start"
                type="time"
                register={register("shift1Start")}
                error={errors.shift1Start?.message}
              />

              <TextField
                label="शिफ्ट-१ बंद वेळ"
                id="shift1End"
                type="time"
                register={register("shift1End")}
                error={errors.shift1End?.message}
              />

              <TextField
                label="शिफ्ट-२ सुरू वेळ"
                id="shift2Start"
                type="time"
                register={register("shift2Start")}
                error={errors.shift2Start?.message}
              />

              <TextField
                label="शिफ्ट-२ बंद वेळ"
                id="shift2End"
                type="time"
                register={register("shift2End")}
                error={errors.shift2End?.message}
              />
            </div>

            <ComputedStat icon={Timer} label="शिफ्टनुसार एकूण तास" value={totalShiftHours} />
          </CardContent>
        </Card>

        {isVehicle && (
          <Card>
            <SectionHeader icon={Truck} title="वाहन तपशील" />
            <CardContent className="space-y-4">
              <TextField
                label="एकूण ट्रिप्स"
                id="tripCount"
                type="number"
                min={0}
                register={register("tripCount")}
                error={errors.tripCount?.message}
              />

              <MicInput
                label="या ठिकाणापासून ते त्या ठिकाणापर्यंत"
                id="locationFromTo"
                register={register("locationFromTo")}
                onVoiceResult={(text) => setValue("locationFromTo", text)}
                error={errors.locationFromTo?.message}
              />
            </CardContent>
          </Card>
        )}

        <div className="space-y-3 pt-1">
          <Button type="submit" disabled={isSubmitting} size="lg" className="w-full">
            {isSubmitting ? <Loader2 className="size-4.5 animate-spin" /> : <CheckCircle2 className="size-4.5" />}
            {isSubmitting ? "जतन होत आहे..." : "सबमिट करा"}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => reset({ ...emptyValues, workDate: todayIso() })}
          >
            <RotateCcw className="size-4.5" />
            रीसेट
          </Button>

          <p className="flex items-center justify-center gap-1.5 text-center text-sm font-medium text-warning">
            <AlertTriangle className="size-4 shrink-0" />
            सर्व माहिती भरून 'सबमिट करा' दाबा.
          </p>
        </div>

        <Separator className="my-6" />

        <div className="grid grid-cols-2 gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate("/dashboard")}>
            <LayoutDashboard className="size-4" />
            Dashboard
          </Button>

          <Button type="button" variant="outline" onClick={() => navigate("/")}>
            <Home className="size-4" />
            मुख्य पृष्ठ
          </Button>
        </div>
      </form>
    </div>
  );
}
