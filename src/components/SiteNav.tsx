"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "The program" },
  { href: "/benches", label: "Benches" },
  { href: "/map", label: "Map" },
];

function isActive(href: string, pathname: string): boolean {
  // "/" only matches itself; other entries also cover their sub-pages (/benches/12)
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-6 text-lg">
      {NAV.map((item) => {
        const active = isActive(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "border-b-2 border-brass-500 pb-0.5 text-cream-50"
                : "border-b-2 border-transparent pb-0.5 text-pine-100 hover:border-pine-400 hover:text-cream-50"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
