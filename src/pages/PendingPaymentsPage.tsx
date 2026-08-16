import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { CheckCircle2, Inbox, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { useAddPendingPayment, useMarkPaymentPaid, usePendingPayments } from "@/lib/queries/pendingPayments";
import type { PendingCategory } from "@/types/database";

const categories: PendingCategory[] = ["Diesel Bill", "Contractor Payment", "Staff Wage", "Other"];

const categoryLabels: Record<PendingCategory, string> = {
  "Diesel Bill": "डिझेल बिल",
  "Contractor Payment": "कंत्राटदार देयक",
  "Staff Wage": "कर्मचारी वेतन",
  Other: "इतर",
};

const statusLabels = { Pending: "प्रलंबित", Paid: "भरले" } as const;

export function PendingPaymentsPage() {
  const { profile } = useAuth();
  const subdivisionId = profile?.subdivision_id ?? null;
  const { data: payments = [] } = usePendingPayments(subdivisionId);
  const addPayment = useAddPendingPayment();
  const markPaid = useMarkPaymentPaid();

  const [category, setCategory] = useState<PendingCategory>("Diesel Bill");
  const [partyName, setPartyName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [remarks, setRemarks] = useState("");

  const totalPending = useMemo(
    () => payments.filter((p) => p.status === "Pending").reduce((sum, p) => sum + p.amount, 0),
    [payments]
  );

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!subdivisionId || !partyName.trim() || !amount) {
      toast.error("सर्व आवश्यक माहिती भरा");
      return;
    }

    try {
      await addPayment.mutateAsync({
        subdivision_id: subdivisionId,
        category,
        party_name: partyName.trim(),
        amount: Number(amount),
        due_date: dueDate || null,
        status: "Pending",
        remarks: remarks || null,
      });
      toast.success("नोंद जतन झाली!");
      setPartyName("");
      setAmount("");
      setDueDate("");
      setRemarks("");
    } catch {
      toast.error("जतन करताना समस्या आली.");
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Wallet className="size-4.5" />
            नवीन नोंद
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>प्रकार</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PendingCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {categoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="partyName">पक्षकाराचे नाव</Label>
              <Input id="partyName" value={partyName} onChange={(e) => setPartyName(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">रक्कम (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={0}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">देय दिनांक</Label>
                <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="remarks">टीप</Label>
              <Textarea id="remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={addPayment.isPending}>
              <Plus className="size-4.5" />
              {addPayment.isPending ? "जतन होत आहे..." : "नोंद जोडा"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {payments.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-accent/60 px-4 py-3">
          <span className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Wallet className="size-4" />
            एकूण प्रलंबित रक्कम
          </span>
          <span className="text-xl font-bold text-destructive">₹{totalPending.toFixed(2)}</span>
        </div>
      )}

      {/* Mobile: card list */}
      <div className="space-y-3 sm:hidden">
        {payments.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
            <Inbox className="size-8" />
            <p className="text-sm">कोणतीही नोंद नाही</p>
          </div>
        )}
        {payments.map((p) => (
          <Card key={p.id}>
            <CardContent className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{p.party_name}</p>
                  <p className="text-xs text-muted-foreground">{categoryLabels[p.category]}</p>
                </div>
                <Badge variant={p.status === "Paid" ? "secondary" : "destructive"}>
                  {statusLabels[p.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">₹{p.amount}</span>
                <span className="text-muted-foreground">{p.due_date ?? "-"}</span>
              </div>
              {p.status === "Pending" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={markPaid.isPending}
                  onClick={() => markPaid.mutate(p.id)}
                >
                  <CheckCircle2 className="size-4" />
                  Paid करा
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Desktop/tablet: table */}
      <Card className="hidden sm:block">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>प्रकार</TableHead>
                <TableHead>पक्षकार</TableHead>
                <TableHead>रक्कम</TableHead>
                <TableHead>देय दिनांक</TableHead>
                <TableHead>स्थिती</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{categoryLabels[p.category]}</TableCell>
                  <TableCell>{p.party_name}</TableCell>
                  <TableCell>₹{p.amount}</TableCell>
                  <TableCell>{p.due_date ?? "-"}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === "Paid" ? "secondary" : "destructive"}>
                      {statusLabels[p.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {p.status === "Pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(p.id)}
                      >
                        <CheckCircle2 className="size-4" />
                        Paid करा
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    कोणतीही नोंद नाही
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </>
  );
}
