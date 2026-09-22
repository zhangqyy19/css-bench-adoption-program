"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addMonths, formatDate, formatTerm, isValidDate, rangesOverlap } from "@/lib/dates";
import type { ApiErrorBody } from "@/lib/errors";
import type { AdoptionReceipt, DateString } from "@/lib/types";
import {
  adoptionInputSchema,
  DEFAULT_TERM_MONTHS,
  MAX_DEDICATION_LENGTH,
  MAX_DEDICATION_LINES,
  MAX_TERM_MONTHS,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation";

type Props = {
  benchId: number;
  benchCode: string;
  today: DateString;
  nextAvailableDate: DateString;
  // current and upcoming adoptions, so clashes are caught before submitting
  takenRanges: { startDate: DateString; endDate: DateString }[];
};

const PRESETS = [
  { label: "1 year", months: 12 },
  { label: "2 years", months: 24 },
  { label: "5 years", months: 60 },
  { label: "10 years", months: 120 },
];

const inputClass =
  "w-full border border-cream-300 bg-white px-3 py-2 outline-none focus:border-pine-600 aria-[invalid=true]:border-red-700";

export function AdoptForm({ benchId, benchCode, today, nextAvailableDate, takenRanges }: Props) {
  const router = useRouter();
  const [donorName, setDonorName] = useState("");
  const [donorEmail, setDonorEmail] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [dedication, setDedication] = useState("");
  const [startDate, setStartDate] = useState(nextAvailableDate);
  const [termMonths, setTermMonths] = useState(DEFAULT_TERM_MONTHS);

  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<AdoptionReceipt | null>(null);

  const termIsValid = Number.isInteger(termMonths) && termMonths >= 1 && termMonths <= MAX_TERM_MONTHS;
  const endDate = isValidDate(startDate) && termIsValid ? addMonths(startDate, termMonths) : null;
  const clash = endDate
    ? takenRanges.find((range) => rangesOverlap(startDate, endDate, range.startDate, range.endDate))
    : undefined;
  const dedicationLines = dedication === "" ? 0 : dedication.split(/\r?\n/).length;

  async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    const parsed = adoptionInputSchema.safeParse({
      donorName,
      donorEmail,
      anonymous,
      displayName: anonymous ? "" : displayName,
      dedication,
      startDate,
      termMonths,
    });
    if (!parsed.success) {
      setErrors(toFieldErrors(parsed.error));
      return;
    }
    if (parsed.data.startDate < today) {
      setErrors({ startDate: "The start date can't be in the past" });
      return;
    }
    if (clash) return; // the message is already on screen
    setErrors({});

    setSubmitting(true);
    try {
      const response = await fetch(`/api/benches/${benchId}/adoptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (response.ok) {
        setReceipt((await response.json()) as AdoptionReceipt);
        router.refresh(); // the page around the form now shows the new adoption
        return;
      }
      const { error } = (await response.json()) as ApiErrorBody;
      if (error.code === "invalid_input" && error.fieldErrors) {
        setErrors(error.fieldErrors);
      } else if (error.code === "conflict") {
        setFormError(
          `Someone just adopted this bench for those dates. It is next available from ${formatDate(
            error.nextAvailableDate ?? nextAvailableDate,
          )}.`,
        );
        if (error.nextAvailableDate) setStartDate(error.nextAvailableDate);
        router.refresh();
      } else {
        setFormError(error.message);
      }
    } catch {
      setFormError("Could not reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div role="status" className="border border-pine-600 bg-pine-50 p-7">
        <p className="eyebrow">Thank you</p>
        <h2 className="mt-2 text-2xl text-pine-900">Bench {receipt.benchCode} is yours.</h2>
        <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
          <dt className="text-ink-500">Reference</dt>
          <dd className="font-mono text-sm">{receipt.reference}</dd>
          <dt className="text-ink-500">Shown as</dt>
          <dd>{receipt.displayName}</dd>
          <dt className="text-ink-500">Term</dt>
          <dd>
            {formatTerm(receipt.termMonths)}, {formatDate(receipt.startDate)} to {formatDate(receipt.endDate)}
          </dd>
        </dl>
        <p className="mt-5 text-base text-ink-700">
          The Alliance will be in touch about your gift and the plaque. Keep the reference number in
          case you need to contact the park.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="border border-pine-200 border-t-4 border-t-pine-600 bg-white p-7 shadow-sm">
      <p className="eyebrow">Adopt this bench</p>
      <h2 className="mt-2 text-2xl text-pine-900">Bench {benchCode}</h2>
      <p className="mt-2 text-base text-ink-700">
        Your adoption is recorded straight away. No payment is taken here; the Alliance will contact
        you about your gift.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        <Field id="donorName" label="Your name" error={errors.donorName}>
          <input
            id="donorName"
            value={donorName}
            onChange={(e) => setDonorName(e.target.value)}
            autoComplete="name"
            aria-invalid={Boolean(errors.donorName)}
            className={inputClass}
          />
        </Field>

        <Field id="donorEmail" label="Email" hint="Only park staff can see this." error={errors.donorEmail}>
          <input
            id="donorEmail"
            type="email"
            value={donorEmail}
            onChange={(e) => setDonorEmail(e.target.value)}
            autoComplete="email"
            aria-invalid={Boolean(errors.donorEmail)}
            className={inputClass}
          />
        </Field>

        <Field
          id="displayName"
          label="Name shown publicly"
          hint="Your name, a family, or an organisation."
          error={errors.displayName}
        >
          <input
            id="displayName"
            value={anonymous ? "" : displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={anonymous}
            placeholder={anonymous ? "Anonymous" : "The Rivera Family"}
            aria-invalid={Boolean(errors.displayName)}
            className={`${inputClass} disabled:bg-cream-100`}
          />
          <label className="mt-2 flex items-center gap-2 text-base text-ink-700">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="size-4 accent-pine-800"
            />
            Adopt anonymously
          </label>
        </Field>

        <Field
          id="dedication"
          label="Plaque inscription (optional)"
          hint={`${dedicationLines}/${MAX_DEDICATION_LINES} lines · ${dedication.length}/${MAX_DEDICATION_LENGTH}`}
          error={errors.dedication}
        >
          <textarea
            id="dedication"
            rows={4}
            value={dedication}
            onChange={(e) => setDedication(e.target.value)}
            maxLength={MAX_DEDICATION_LENGTH}
            placeholder={"In loving memory of\nRuth Klein\nwho loved this view"}
            aria-invalid={Boolean(errors.dedication)}
            className={`${inputClass} text-center italic`}
          />
          <p className="mt-1 text-sm text-ink-500">Up to seven lines. Fewer lines mean larger lettering.</p>
        </Field>

        <Field id="startDate" label="Start date" error={errors.startDate}>
          <input
            id="startDate"
            type="date"
            value={startDate}
            min={nextAvailableDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-invalid={Boolean(errors.startDate)}
            className={inputClass}
          />
        </Field>

        <Field
          id="termMonths"
          label="Term"
          hint="The standard adoption is ten years."
          error={errors.termMonths}
        >
          <div className="mb-2 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.months}
                type="button"
                aria-pressed={termMonths === preset.months}
                onClick={() => setTermMonths(preset.months)}
                className={`border px-3 py-1 text-sm ${
                  termMonths === preset.months
                    ? "border-pine-800 bg-pine-800 text-cream-50"
                    : "border-cream-300 text-ink-700 hover:border-pine-600"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              id="termMonths"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_TERM_MONTHS}
              step={1}
              value={Number.isNaN(termMonths) ? "" : termMonths}
              onChange={(e) => setTermMonths(e.target.valueAsNumber)}
              aria-invalid={Boolean(errors.termMonths)}
              className={`${inputClass} w-28`}
            />
            <span className="text-ink-700">months</span>
          </div>
        </Field>

        {endDate && !clash && (
          <p className="border-l-2 border-pine-600 bg-pine-50 px-3 py-2 text-pine-900">
            {formatTerm(termMonths)}: {formatDate(startDate)} to {formatDate(endDate)}
          </p>
        )}
        {clash && (
          <p role="alert" className="border-l-2 border-brass-700 bg-cream-100 px-3 py-2 text-ink-900">
            Those dates overlap an adoption from {formatDate(clash.startDate)} to {formatDate(clash.endDate)}.
            Choose a shorter term or a later start date.
          </p>
        )}
        {formError && (
          <p role="alert" className="border-l-2 border-red-700 bg-red-50 px-3 py-2 text-red-900">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="rounded-sm bg-pine-800 px-5 py-3 text-lg text-cream-50 hover:bg-pine-700 disabled:opacity-60"
        >
          {submitting ? "Adopting…" : `Adopt bench ${benchCode}`}
        </button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-ink-900">
          {label}
        </label>
        {hint && <span className="text-sm text-ink-500">{hint}</span>}
      </div>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-800">
          {error}
        </p>
      )}
    </div>
  );
}
