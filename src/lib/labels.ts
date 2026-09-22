// Human-facing labels for bench attributes, shared by server and client components.

export function sideLabel(side: number): string {
  return side === 1 ? "A" : "B";
}

export function describeBench(bench: { style: string; lengthFt: number; sides: number }): string {
  const style = bench.style === "worlds-fair" ? "World's Fair" : "Concrete base";
  return `${bench.lengthFt} ft ${style}${bench.sides === 2 ? ", two sides" : ""}`;
}
