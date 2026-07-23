import { NextResponse } from "next/server";
import { getCurrentTrainer } from "@/lib/auth";

export async function GET() {
  const { user, trainer, isAdmin } = await getCurrentTrainer();

  if (!user) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    email: user.email,
    trainer,
    isAdmin,
  });
}
