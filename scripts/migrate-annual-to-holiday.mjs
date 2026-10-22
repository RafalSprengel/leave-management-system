import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import mongoose from "mongoose";

const apply = process.argv.includes("--apply");

const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
const uriLine = envFile.split(/\r?\n/).find((line) => line.startsWith("MONGODB_URI="));
if (!uriLine) {
  throw new Error("MONGODB_URI not found in .env.local");
}
const uri = uriLine.slice("MONGODB_URI=".length).trim().replace(/^['"]|['"]$/g, "");

await mongoose.connect(uri);
const db = mongoose.connection.db;

const leaveRequests = db.collection("leaverequests");
const leaveAllowances = db.collection("leaveallowances");
const settings = db.collection("organizationsettings");

const [requestCount, allowanceCount, settingsWithAnnual] = await Promise.all([
  leaveRequests.countDocuments({ type: "annual" }),
  leaveAllowances.countDocuments({ type: "annual" }),
  settings.countDocuments({ "defaultAllowances.annual": { $exists: true } }),
]);

const conflicts = await leaveAllowances
  .aggregate([
    { $match: { type: "annual" } },
    {
      $lookup: {
        from: "leaveallowances",
        let: { org: "$organizationId", emp: "$employee" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$organizationId", "$$org"] },
                  { $eq: ["$employee", "$$emp"] },
                  { $eq: ["$type", "holiday"] },
                ],
              },
            },
          },
        ],
        as: "holidayDocs",
      },
    },
    { $match: { "holidayDocs.0": { $exists: true } } },
    { $project: { _id: 1, organizationId: 1, employee: 1 } },
  ])
  .toArray();

console.log(JSON.stringify({
  mode: apply ? "APPLY" : "DRY-RUN",
  leaveRequestsAnnual: requestCount,
  leaveAllowancesAnnual: allowanceCount,
  organizationSettingsWithDefaultAnnual: settingsWithAnnual,
  allowanceConflicts: conflicts.length,
}, null, 2));

if (conflicts.length > 0) {
  console.log("Conflicting annual allowances (employee already has a holiday allowance). Aborting, nothing changed:");
  console.log(JSON.stringify(conflicts, null, 2));
  await mongoose.disconnect();
  process.exit(1);
}

if (!apply) {
  console.log("Dry-run only. Re-run with --apply to write changes.");
  await mongoose.disconnect();
  process.exit(0);
}

const requestResult = await leaveRequests.updateMany({ type: "annual" }, { $set: { type: "holiday" } });
const allowanceResult = await leaveAllowances.updateMany({ type: "annual" }, { $set: { type: "holiday" } });
const settingsResult = await settings.updateMany(
  { "defaultAllowances.annual": { $exists: true } },
  [
    {
      $set: {
        "defaultAllowances.holiday": "$defaultAllowances.annual",
      },
    },
    { $unset: "defaultAllowances.annual" },
  ],
);

console.log(JSON.stringify({
  leaveRequestsModified: requestResult.modifiedCount,
  leaveAllowancesModified: allowanceResult.modifiedCount,
  organizationSettingsModified: settingsResult.modifiedCount,
}, null, 2));

await mongoose.disconnect();
