import { NextResponse } from "next/server";
import { getCurrentTrainer } from "@/lib/auth";
import { buildBackupPayload } from "@/lib/backup";

export async function GET() {
  const { isAdmin } = await getCurrentTrainer();
  if (!isAdmin) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const payload = await buildBackupPayload();

  const date = new Date().toISOString().slice(0, 10);
  const filename = `luckytrades-backup-${date}.json`;

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
