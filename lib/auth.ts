import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function getCurrentTrainer() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, trainer: null, isAdmin: false };
  }

  const trainer = await prisma.trainer.findUnique({
    where: { authUserId: user.id },
  });

  const isAdmin = user.email === process.env.ADMIN_EMAIL;

  return { user, trainer, isAdmin };
}

export async function isAuthenticated() {
  const { user } = await getCurrentTrainer();
  return user !== null;
}
