"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelButton({ adoptionId, benchCode }: { adoptionId: number; benchCode: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm(`Cancel this adoption of ${benchCode}? The dates become available again.`)) return;
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/adoptions/${adoptionId}/cancel`, { method: "POST" });
    setBusy(false);
    if (response.ok) router.refresh();
    else setError("Could not cancel");
  }

  return (
    <>
      <button
        type="button"
        onClick={cancel}
        disabled={busy}
        className="text-sm text-red-800 underline-offset-4 hover:underline disabled:opacity-60"
      >
        {busy ? "Cancelling…" : "Cancel"}
      </button>
      {error && <div className="text-xs text-red-800">{error}</div>}
    </>
  );
}
