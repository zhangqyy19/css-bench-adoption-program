import { todayInPark } from "./dates";
import { getDb } from "./db";
import * as service from "./service";
import type { AdoptionReceipt, BenchDetail, BenchPage, BenchPin, BenchQuery, DateString, Stats } from "./types";
import type { AdoptionInput } from "./validation";

// What the pages and route handlers call: the service functions bound to the
// app's shared database connection and to today's date in the park.

export { PAGE_SIZE } from "./service";

export async function listAreas(): Promise<string[]> {
  return service.listAreas(await getDb());
}

export async function getStats(today: DateString = todayInPark()): Promise<Stats> {
  return service.getStats(await getDb(), today);
}

export async function listBenches(query: BenchQuery, today: DateString = todayInPark()): Promise<BenchPage> {
  return service.listBenches(await getDb(), query, today);
}

export async function listBenchPins(today: DateString = todayInPark()): Promise<BenchPin[]> {
  return service.listBenchPins(await getDb(), today);
}

export async function getBench(id: number, today: DateString = todayInPark()): Promise<BenchDetail | null> {
  return service.getBench(await getDb(), id, today);
}

export async function createAdoption(
  benchId: number,
  input: AdoptionInput,
  today: DateString = todayInPark(),
): Promise<AdoptionReceipt> {
  return service.createAdoption(await getDb(), benchId, input, today);
}

export async function listAdoptionsForStaff() {
  return service.listAdoptionsForStaff(await getDb());
}

export async function cancelAdoption(id: number): Promise<void> {
  return service.cancelAdoption(await getDb(), id);
}
