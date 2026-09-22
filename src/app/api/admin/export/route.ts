import { isStaff } from "@/lib/admin-auth";
import { listAdoptionsForStaff } from "@/lib/data";
import { sideLabel } from "@/lib/labels";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET() {
  if (!(await isStaff())) return new Response("Not authorised", { status: 401 });

  const header = [
    "id", "bench", "area", "side", "status", "donor_name", "donor_email", "display_name", "honoree",
    "plaque_text", "start_date", "end_date", "term_months", "notes", "created_at",
  ];
  const rows = (await listAdoptionsForStaff()).map((a) => [
    a.id, a.benchCode, a.benchArea, sideLabel(a.side), a.status, a.donorName, a.donorEmail, a.displayName,
    a.honoree, a.dedication, a.startDate, a.endDate, a.termMonths, a.notes, a.createdAt,
  ]);
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bench-adoptions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
