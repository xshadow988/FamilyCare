import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const medicine = await prisma.medicine.update({
    where: { id },
    data: {
      name: body.name,
      category: body.category,
      stock: body.stock,
      unit: body.unit,
      purchasePrice: body.purchasePrice,
      sellingPrice: body.sellingPrice,
      minStock: body.minStock,
      tabletsPerStrip: body.tabletsPerStrip ?? 1,
    },
  });
  return NextResponse.json(medicine);
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await prisma.medicine.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
