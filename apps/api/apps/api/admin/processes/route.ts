import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const processes = await db.processes.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const formattedProcesses = processes.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category?.name || "Uncategorized", // Use category.name from the join
      setupTime: p.setup_time,
      hourlyRate: p.hourly_rate,
      minimumCost: p.minimum_cost,
      complexityMultiplier: p.complexity_multiplier,
      active: p.active,
      description: p.description,
      equipmentRequired: p.equipment_required,
      skillLevel: p.skill_level,
    }));

    return NextResponse.json(formattedProcesses);
  } catch (error) {
    console.error("Error fetching processes:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}