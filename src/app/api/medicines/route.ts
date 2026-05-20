import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const medicines = await prisma.medicine.findMany({ orderBy: { createdAt: 'asc' } });
  return NextResponse.json(medicines);
}

export async function POST(req: Request) {
  const body = await req.json();
  const medicine = await prisma.medicine.create({
    data: {
      name: body.name,
      category: body.category,
      stock: body.stock ?? 0,
      unit: body.unit,
      purchasePrice: body.purchasePrice,
      sellingPrice: body.sellingPrice,
      minStock: body.minStock ?? 50,
    },
  });
  return NextResponse.json(medicine, { status: 201 });
}
