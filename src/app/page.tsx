import Image from "next/image";
import Link from "next/link";
import { getStats } from "@/lib/data";

// availability changes daily, so never prerender at build time
export const dynamic = "force-dynamic";

// Program details from vancortlandt.org/bench
const OPTIONS = [
  {
    name: "Adopt an existing bench",
    price: "$3,500",
    body: "Choose any available bench in the park. A personalized plaque is installed on it, usually within six to eight weeks.",
  },
  {
    name: "Install a new bench",
    price: "from $5,500",
    body: "A new bench with your plaque, placed at a pre-approved location on the perimeter of the Parade Ground. Allow about three months.",
  },
];

const DETAILS = [
  {
    title: "The plaque",
    body: "Up to seven lines of text of your choosing. Fewer lines mean larger, more readable lettering. Benches are World's Fair style or concrete-base, four or eight feet long; both sides of an eight-foot bench may be adopted separately.",
  },
  {
    title: "The term",
    body: "The standard adoption lasts ten years, and the Alliance maintains the bench for the whole of that period. If a bench ever has to be removed for capital improvements, your plaque is moved to another bench.",
  },
  {
    title: "Your gift",
    body: "Your donation is fully tax deductible. Payment can be made online, by check, or by Zelle after speaking with a representative, and group fundraising pages are available on request.",
  },
];

const STEPS = [
  ["Find a bench", "Browse the list or the map. Every bench shows whether it is adopted, by whom, and until when."],
  ["Tell us about it", "Enter your details, the name to show publicly, and the inscription for the plaque."],
  ["We take it from there", "The Alliance will be in touch about payment, and your plaque will be installed within a few weeks."],
];

const button = "inline-block rounded-sm bg-pine-700 px-7 py-3 text-lg text-cream-50 shadow-md hover:bg-pine-600";

export default async function IntroPage() {
  const stats = await getStats();

  return (
    <div className="flex flex-col">
      {/* hero: the park gate, with a green wash so the text reads */}
      <section className="relative isolate flex min-h-[32rem] items-center overflow-hidden bg-pine-900 text-cream-50">
        <Image
          src="/van-cortlandt.jpeg"
          alt="The brick and wrought-iron entrance gate to Van Cortlandt Park, with trees and a bench beyond"
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-pine-900/95 via-pine-900/65 to-pine-900/30" />
        <div className="wrap py-20 text-center">
          <h1 className="mx-auto max-w-3xl text-5xl leading-tight sm:text-6xl">
            Give someone a place to sit in Van Cortlandt Park.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-pine-100">
            Adopting a bench places a personalized plaque on one of the more than five hundred benches
            across the park, honors a person or an occasion, and helps the Van Cortlandt Park Alliance
            care for the Bronx&rsquo;s largest park.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5">
            <Link
              href="/benches"
              className="inline-block rounded-sm bg-cream-50 px-7 py-3 text-lg text-pine-900 shadow-md hover:bg-cream-100"
            >
              Adopt a bench
            </Link>
            <Link href="/map" className="text-lg text-cream-50 underline-offset-4 hover:underline">
              See the map
            </Link>
          </div>
          <p className="mt-8 text-pine-100">
            {stats.available} of {stats.total} benches are available today.
          </p>
        </div>
      </section>

      <section className="wrap py-16">
        <h2 className="rule text-center text-sm uppercase tracking-[0.2em]">Two ways to give</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {OPTIONS.map((option) => (
            <article key={option.name} className="border-t-4 border-pine-600 bg-white p-8 shadow-sm">
              <p className="text-2xl text-pine-900">{option.name}</p>
              <p className="mt-1 text-lg text-brass-700">{option.price}</p>
              <p className="mt-4 text-ink-700">{option.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-pine-50 py-16">
        <div className="wrap grid gap-10 md:grid-cols-3">
          {DETAILS.map((detail) => (
            <div key={detail.title} className="border-l-2 border-pine-400 pl-5">
              <h2 className="text-2xl text-pine-900">{detail.title}</h2>
              <p className="mt-2 text-ink-700">{detail.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="wrap py-16 text-center">
        <p className="eyebrow">Three steps</p>
        <h2 className="mt-2 text-3xl text-pine-900">How it works</h2>
        <ol className="mx-auto mt-8 grid max-w-4xl gap-8 text-left sm:grid-cols-3">
          {STEPS.map(([title, body], index) => (
            <li key={title}>
              <span className="inline-flex size-9 items-center justify-center rounded-full bg-pine-700 text-lg text-cream-50">
                {index + 1}
              </span>
              <p className="mt-3 text-xl text-pine-900">{title}</p>
              <p className="mt-1 text-ink-700">{body}</p>
            </li>
          ))}
        </ol>
        <Link href="/benches" className={`${button} mt-10`}>
          Adopt a bench
        </Link>
        <p className="mt-6 text-sm text-ink-500">
          Questions? Write to{" "}
          <a href="mailto:info@vancortlandt.org" className="text-pine-800 hover:underline">
            info@vancortlandt.org
          </a>{" "}
          or call 718-601-1460. Program details from{" "}
          <a href="https://vancortlandt.org/bench/" target="_blank" rel="noreferrer" className="text-pine-800 hover:underline">
            vancortlandt.org
          </a>
          .
        </p>
      </section>
    </div>
  );
}
