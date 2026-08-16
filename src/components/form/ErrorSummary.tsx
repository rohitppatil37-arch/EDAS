import type { FieldErrors } from "react-hook-form";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function ErrorSummary({ errors }: { errors: FieldErrors }) {
  const messages = Object.values(errors)
    .map((e) => (e as { message?: string } | undefined)?.message)
    .filter((m): m is string => !!m);

  if (messages.length === 0) return null;

  return (
    <Alert variant="destructive" className="mb-4">
      <AlertTriangle />
      <AlertTitle>खालील माहिती भरणे आवश्यक आहे</AlertTitle>
      <AlertDescription>
        <ul className="list-disc space-y-0.5 pl-4">
          {messages.map((m, i) => (
            <li key={i}>{m}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
