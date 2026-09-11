import { Types } from "mongoose";
import { Printer, type IPrinter } from "../models/Printer";

/**
 * Pick best printer for a shop job:
 * - color → printers with "color" capability, not offline
 * - bw → printers with "bw" capability, not offline
 * - sort by priority (lower first), then prefer "available" over "busy"
 * - if none, return null (job stays queued unassigned)
 */
export async function assignPrinterForJob(
  shopId: Types.ObjectId | string,
  colorMode: "bw" | "color"
): Promise<IPrinter | null> {
  const printers = await Printer.find({
    shopId,
    capabilities: colorMode,
    status: { $ne: "offline" },
  }).lean();

  if (!printers.length) return null;

  const statusRank = (s: string) => (s === "available" ? 0 : s === "busy" ? 1 : 2);
  printers.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return statusRank(a.status) - statusRank(b.status);
  });

  const best = printers[0];
  return (await Printer.findById(best._id)) as IPrinter | null;
}
