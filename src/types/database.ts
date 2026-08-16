// Hand-written to match supabase/migrations/0001_init.sql.
// Regenerate with `supabase gen types typescript` once the project is linked, if preferred.

export interface Subdivision {
  id: string;
  code: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  subdivision_id: string | null;
  display_name: string | null;
  role: "admin" | "superadmin";
  created_at: string;
}

export type StaffRole = "Driver" | "Operator";

export interface Staff {
  id: string;
  subdivision_id: string;
  name: string;
  role: StaffRole;
  phone: string | null;
  active: boolean;
  created_at: string;
}

export type MachineCategory = "Machine" | "Vehicle";

export interface Machine {
  id: string;
  subdivision_id: string;
  machine_type: string;
  machine_name: string;
  category: MachineCategory;
  expected_efficiency: number | null;
  capacity: number | null;
  active: boolean;
  created_at: string;
}

export interface Project {
  id: string;
  subdivision_id: string;
  work_type: string;
  project_name: string;
  active: boolean;
  created_at: string;
}

export interface WorkLog {
  id: string;
  subdivision_id: string;
  work_date: string;
  work_type: string;
  project_id: string | null;
  machine_id: string;
  staff_id: string;
  diesel_qty: number;
  diesel_time: string | null;
  diesel_reading: number | null;
  start_reading: number;
  end_reading: number;
  total_reading: number;
  shift1_start: string | null;
  shift1_end: string | null;
  shift2_start: string | null;
  shift2_end: string | null;
  total_shift_hours: number | null;
  trip_count: number | null;
  location_from_to: string | null;
  remark: string | null;
  created_at: string;
}

export type WorkLogInsert = Omit<WorkLog, "id" | "total_reading" | "created_at">;

export interface GpsLog {
  id: string;
  subdivision_id: string;
  machine_id: string;
  work_log_id: string | null;
  recorded_at: string;
  latitude: number;
  longitude: number;
  location_label: string | null;
  created_by: string | null;
  created_at: string;
}

export type GpsLogInsert = Omit<GpsLog, "id" | "created_at" | "created_by">;

export type AttendanceStatus = "Present" | "Absent" | "Half Day" | "Leave";
export type AttendanceSource = "manual" | "auto";

export interface Attendance {
  id: string;
  subdivision_id: string;
  staff_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  source: AttendanceSource;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
}

export type AttendanceUpsert = Omit<Attendance, "id" | "created_at" | "created_by">;

export type PendingCategory = "Diesel Bill" | "Contractor Payment" | "Staff Wage" | "Other";
export type PendingStatus = "Pending" | "Paid";

export interface PendingPayment {
  id: string;
  subdivision_id: string;
  category: PendingCategory;
  party_name: string;
  amount: number;
  due_date: string | null;
  status: PendingStatus;
  remarks: string | null;
  created_by: string | null;
  created_at: string;
}

export type PendingPaymentInsert = Omit<PendingPayment, "id" | "created_at" | "created_by">;

export interface FuelPerformanceRow {
  machine_id: string;
  machine: string;
  category: MachineCategory;
  expected: number;
  actual: number;
  hours: number;
  diesel: number;
}

export interface MachineEarthworkProgressRow {
  machine_id: string;
  machine_name: string;
  capacity: number | null;
  total_trips: number;
  total_hours: number;
}
