import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: {
      clerkId: userId,
    },
    include: {
      collector: true,
    },
  });

  return user;
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
