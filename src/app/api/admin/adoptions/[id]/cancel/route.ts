import { NextResponse } from "next/server";
import { isStaff } from "@/lib/admin-auth";
import { cancelAdoption } from "@/lib/data";
import { NotFoundError } from "@/lib/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isStaff())) return NextResponse.json({ error: "Not authorised" }, { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    await cancelAdoption(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    console.error(error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
