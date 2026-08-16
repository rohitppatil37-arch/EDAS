import type { UseFormRegisterReturn } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface TextFieldProps {
  label: string;
  id: string;
  type?: string;
  register: UseFormRegisterReturn;
  error?: string;
  readOnly?: boolean;
  disabled?: boolean;
  placeholder?: string;
  step?: string;
  min?: string | number;
}

export function TextField({
  label,
  id,
  type = "text",
  register,
  error,
  readOnly,
  disabled,
  placeholder,
  step,
  min,
}: TextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        step={step}
        min={min}
        placeholder={placeholder}
        readOnly={readOnly}
        disabled={disabled}
        className={cn(error && "border-destructive", readOnly && "bg-muted")}
        {...register}
      />
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
