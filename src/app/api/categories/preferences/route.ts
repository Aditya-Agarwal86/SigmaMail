import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET: Retrieve category order, hidden categories, and custom display names for the authenticated student.
 */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prefs = await prisma.userPreference.findUnique({
    where: { userId: user.id },
    select: {
      categoryOrder: true,
      hiddenCategories: true,
      categoryNames: true,
    },
  });

  return NextResponse.json({
    categoryOrder: prefs?.categoryOrder || null,
    hiddenCategories: prefs?.hiddenCategories || [],
    categoryNames: prefs?.categoryNames || {},
  });
}

/**
 * POST / PUT: Update category order, hidden categories, and custom category display names.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { categoryOrder, hiddenCategories, categoryNames, reset, resetNames } = body;

    let updated;
    if (reset) {
      updated = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {
          categoryOrder: Prisma.JsonNull,
          hiddenCategories: [],
          categoryNames: Prisma.JsonNull,
        },
        create: {
          userId: user.id,
          categoryOrder: Prisma.JsonNull,
          hiddenCategories: [],
          categoryNames: Prisma.JsonNull,
        },
      });
    } else if (resetNames) {
      updated = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {
          categoryNames: Prisma.JsonNull,
        },
        create: {
          userId: user.id,
          categoryNames: Prisma.JsonNull,
        },
      });
    } else {
      updated = await prisma.userPreference.upsert({
        where: { userId: user.id },
        update: {
          categoryOrder: categoryOrder !== undefined ? categoryOrder : undefined,
          hiddenCategories: Array.isArray(hiddenCategories) ? hiddenCategories : undefined,
          categoryNames: categoryNames !== undefined ? categoryNames : undefined,
        },
        create: {
          userId: user.id,
          categoryOrder: categoryOrder || Prisma.JsonNull,
          hiddenCategories: Array.isArray(hiddenCategories) ? hiddenCategories : [],
          categoryNames: categoryNames || Prisma.JsonNull,
        },
      });
    }

    return NextResponse.json({
      success: true,
      categoryOrder: updated.categoryOrder,
      hiddenCategories: updated.hiddenCategories,
      categoryNames: updated.categoryNames || {},
    });
  } catch (err: any) {
    console.error("Error updating category preferences:", err);
    return NextResponse.json({ error: "Failed to update category preferences" }, { status: 500 });
  }
}

