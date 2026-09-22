import { NextResponse } from "next/server";
import { createAdoption } from "@/lib/data";
import { ConflictError, InvalidInputError, NotFoundError, type ApiErrorBody } from "@/lib/errors";
import { adoptionInputSchema, toFieldErrors } from "@/lib/validation";

function fail(status: number, error: ApiErrorBody["error"]) {
  return NextResponse.json<ApiErrorBody>({ error }, { status });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const benchId = Number((await params).id);
  if (!Number.isInteger(benchId)) {
    return fail(404, { code: "not_found", message: "Bench not found" });
  }

  const body = await request.json().catch(() => null);
  const parsed = adoptionInputSchema.safeParse(body);
  if (!parsed.success) {
    return fail(400, {
      code: "invalid_input",
      message: "Some details need fixing",
      fieldErrors: toFieldErrors(parsed.error),
    });
  }

  try {
    const receipt = await createAdoption(benchId, parsed.data);
    return NextResponse.json(receipt, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return fail(404, { code: "not_found", message: error.message });
    }
    if (error instanceof InvalidInputError) {
      return fail(400, {
        code: "invalid_input",
        message: "Some details need fixing",
        fieldErrors: error.fieldErrors,
      });
    }
    if (error instanceof ConflictError) {
      return fail(409, {
        code: "conflict",
        message: error.message,
        nextAvailableDate: error.nextAvailableDate,
      });
    }
    console.error(error);
    return fail(500, { code: "server_error", message: "Something went wrong. Please try again." });
  }
}
