import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/reminders - Get all reminders for a user
export async function GET(req: Request) {
  try {
    // Get the user ID from the query parameters
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Get all reminders for the user
    const reminders = await prisma.reminder.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        due_date: "asc",
      },
    });

    return NextResponse.json({ reminders });
  } catch (error) {
    console.error("Error fetching reminders:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminders" },
      { status: 500 }
    );
  }
}

// POST /api/reminders - Create a new reminder
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, due_date, user_id, recurrence_type, recurrence_days, recurrence_time } = body;

    if (!title || !due_date || !user_id) {
      return NextResponse.json(
        { error: "Title, due date, and user ID are required" },
        { status: 400 }
      );
    }

    // Ensure recurrence_time is stored as an integer
    let parsedRecurrenceTime = null;
    if (recurrence_time !== undefined && recurrence_time !== null) {
      parsedRecurrenceTime = parseInt(recurrence_time, 10);
      // If parsing fails, log a warning
      if (isNaN(parsedRecurrenceTime)) {
        console.warn(`Invalid recurrence_time value: ${recurrence_time}, setting to null`);
        parsedRecurrenceTime = null;
      }
    }

    const reminder = await prisma.reminder.create({
      data: {
        title,
        description,
        due_date: new Date(due_date),
        user_id,
        status: "pending",
        recurrence_type: recurrence_type || "none",
        recurrence_days: recurrence_days || [],
        recurrence_time: parsedRecurrenceTime
      },
    });

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error("Error creating reminder:", error);
    return NextResponse.json(
      { error: "Failed to create reminder" },
      { status: 500 }
    );
  }
}
