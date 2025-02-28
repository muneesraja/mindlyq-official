import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET /api/reminders/[id] - Get a specific reminder
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reminder = await prisma.reminder.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!reminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ reminder });
  } catch (error) {
    console.error("Error fetching reminder:", error);
    return NextResponse.json(
      { error: "Failed to fetch reminder" },
      { status: 500 }
    );
  }
}

// PUT /api/reminders/[id] - Update a reminder
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { title, description, due_date, status, recurrence_type, recurrence_days, recurrence_time } = body;

    // Check if the reminder exists
    const existingReminder = await prisma.reminder.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Update the reminder
    const updatedReminder = await prisma.reminder.update({
      where: {
        id: params.id,
      },
      data: {
        title: title !== undefined ? title : existingReminder.title,
        description: description !== undefined ? description : existingReminder.description,
        due_date: due_date ? new Date(due_date) : existingReminder.due_date,
        status: status || existingReminder.status,
        recurrence_type: recurrence_type || existingReminder.recurrence_type,
        recurrence_days: recurrence_days || existingReminder.recurrence_days,
        recurrence_time: recurrence_time || existingReminder.recurrence_time,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ reminder: updatedReminder });
  } catch (error) {
    console.error("Error updating reminder:", error);
    return NextResponse.json(
      { error: "Failed to update reminder" },
      { status: 500 }
    );
  }
}

// DELETE /api/reminders/[id] - Delete a reminder
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if the reminder exists
    const existingReminder = await prisma.reminder.findUnique({
      where: {
        id: params.id,
      },
    });

    if (!existingReminder) {
      return NextResponse.json(
        { error: "Reminder not found" },
        { status: 404 }
      );
    }

    // Delete the reminder
    await prisma.reminder.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting reminder:", error);
    return NextResponse.json(
      { error: "Failed to delete reminder" },
      { status: 500 }
    );
  }
}
