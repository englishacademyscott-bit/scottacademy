"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
export async function markNotificationsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, read: false }, data: { read: true } });
  revalidatePath("/app", "layout");
}
