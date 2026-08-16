import type { UseFormRegisterReturn } from "react-hook-form";
import { Mic } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { cn } from "@/lib/utils";

interface MicInputProps {
  label: string;
  id: string;
  register: UseFormRegisterReturn;
  onVoiceResult: (text: string) => void;
  error?: string;
  disabled?: boolean;
}

export function MicInput({ label, id, register, onVoiceResult, error, disabled }: MicInputProps) {
  const { toggle, isRecording, status, supported } = useVoiceInput(onVoiceResult);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          disabled={disabled}
          className={cn("flex-1", error && "border-destructive")}
          {...register}
        />
        {supported && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            onClick={toggle}
            className={cn(isRecording && "animate-pulse bg-destructive text-destructive-foreground")}
          >
            <Mic className="size-4" />
          </Button>
        )}
      </div>
      {status && <p className="text-xs text-primary">{status}</p>}
      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
