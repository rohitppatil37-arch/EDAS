import { z } from "zod";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export const workLogSchema = z
  .object({
    workDate: z.string().min(1, "आजचा दिनांक आवश्यक आहे"),
    subdivisionId: z.string().min(1, "उपविभाग निवडा"),
    workType: z.string().min(1, "कामाचा प्रकार निवडा"),
    projectId: z.string().min(1, "प्रकल्पाचे नाव निवडा"),
    machineType: z.string().min(1, "सयंत्राचा प्रकार निवडा"),
    machineId: z.string().min(1, "मशीन निवडा"),
    machineCategory: z.string(),
    staffId: z.string().min(1, "चालक / ऑपरेटर निवडा"),
    dieselQty: z.string().min(1, "डिझेल प्रमाण आवश्यक आहे"),
    dieselTime: z.string(),
    dieselReading: z.string(),
    startReading: z.string().min(1, "सुरुवातीचे reading आवश्यक आहे"),
    endReading: z.string().min(1, "शेवटचे reading आवश्यक आहे"),
    shift1Start: z.string().min(1, "शिफ्ट-१ सुरू वेळ आवश्यक आहे"),
    shift1End: z.string().min(1, "शिफ्ट-१ बंद वेळ आवश्यक आहे"),
    shift2Start: z.string().min(1, "शिफ्ट-२ सुरू वेळ आवश्यक आहे"),
    shift2End: z.string().min(1, "शिफ्ट-२ बंद वेळ आवश्यक आहे"),
    tripCount: z.string(),
    locationFromTo: z.string(),
  })
  .superRefine((data, ctx) => {
    const start = Number(data.startReading);
    const end = Number(data.endReading);

    if (isNaN(start) || isNaN(end) || end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endReading"],
        message: "शेवटचे reading सुरुवातीपेक्षा मोठे असावे",
      });
    }

    const diesel = Number(data.dieselQty);
    if (isNaN(diesel) || diesel < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dieselQty"],
        message: "डिझेल प्रमाण वैध संख्या असावी",
      });
    } else if (diesel > 0) {
      if (!data.dieselTime) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dieselTime"], message: "डिझेल वेळ आवश्यक आहे" });
      }
      if (!data.dieselReading) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["dieselReading"],
          message: "डिझेल reading आवश्यक आहे",
        });
      }
    }

    if (data.shift1Start && data.shift1End) {
      if (timeToMinutes(data.shift1End) <= timeToMinutes(data.shift1Start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shift1End"],
          message: "शिफ्ट-१ बंद वेळ सुरू वेळेपेक्षा मोठी असावी",
        });
      }
    }

    if (data.shift2Start && data.shift2End) {
      if (timeToMinutes(data.shift2End) <= timeToMinutes(data.shift2Start)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["shift2End"],
          message: "शिफ्ट-२ बंद वेळ सुरू वेळेपेक्षा मोठी असावी",
        });
      }
    }

    if (data.machineCategory === "Vehicle") {
      if (!data.tripCount) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["tripCount"], message: "एकूण ट्रिप्स आवश्यक आहे" });
      }
      if (!data.locationFromTo?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["locationFromTo"],
          message: "स्थान माहिती आवश्यक आहे",
        });
      }
    }
  });

export type WorkLogFormValues = z.infer<typeof workLogSchema>;

export function calcTotalReading(startReading: string, endReading: string) {
  const start = Number(startReading);
  const end = Number(endReading);
  if (isNaN(start) || isNaN(end) || end < start) return null;
  return Number((end - start).toFixed(1));
}

function toHours(t: string) {
  if (!t) return 0;
  const [h, m] = t.split(":").map(Number);
  return h + m / 60;
}

export function calcShiftHours(
  shift1Start: string,
  shift1End: string,
  shift2Start: string,
  shift2End: string
) {
  const total =
    Math.max(0, toHours(shift1End) - toHours(shift1Start)) +
    Math.max(0, toHours(shift2End) - toHours(shift2Start));
  return Number(total.toFixed(1));
}
