import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/prisma";

function isAdmin(req: NextRequest) {
  return req.cookies.get("vbf_admin")?.value === process.env.ADMIN_SECRET;
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdmin(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  // Remove FK-constrained child records first, then the product
  await db.roundupItem.deleteMany({ where: { productId: id } });
  await db.comparisonProduct.deleteMany({ where: { productId: id } });
  await db.product.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
