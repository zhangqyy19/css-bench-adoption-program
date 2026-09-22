import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-16 text-center">
      <p className="eyebrow">Not found</p>
      <h1 className="mt-2 text-3xl text-pine-900">We couldn&apos;t find that bench</h1>
      <p className="mt-3 text-lg text-ink-700">It may have been removed from the program, or the link is wrong.</p>
      <Link href="/benches" className="mt-8 inline-block text-pine-800 underline-offset-4 hover:underline">
        Browse all benches
      </Link>
    </div>
  );
}
