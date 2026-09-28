import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

import { prisma } from "@/lib/db/prisma";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        {
          success: false,
          error: "Clerk user not found",
        },
        { status: 404 },
      );
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error: "User email not found",
        },
        { status: 400 },
      );
    }

    const name =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
      null;

    const user = await prisma.user.upsert({
      where: {
        clerkId: userId,
      },

      update: {
        email,
        name,
      },

      create: {
        clerkId: userId,
        email,
        name,
        role: "COLLECTOR",

        collector: {
          create: {},
        },
      },

      include: {
        collector: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Auth sync error:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to sync user",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({
    message: "Auth sync API is alive",
  });
}
