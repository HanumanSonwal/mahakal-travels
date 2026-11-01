import { isOwnerRequest } from "@/lib/booking";
import { connectDB } from "@/lib/db";
import { FullDayBooking, VehicleOption } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isOwnerRequest(req))
    return NextResponse.json(
      { error: "Sign in as owner to update requests." },
      { status: 401 },
    );
  try {
    const body = await req.json();
    const { status, quotedFare } = body;
    const vehicleNumber = String(body.vehicleNumber || "")
      .trim()
      .toUpperCase();
    const driverPhone = String(body.driverPhone || "").trim();
    if (!["CONFIRMED", "DECLINED"].includes(status))
      return NextResponse.json(
        { error: "Choose a valid request status." },
        { status: 400 },
      );
    if (
      status === "CONFIRMED" &&
      (quotedFare === undefined ||
        String(quotedFare).trim() === "" ||
        !Number.isFinite(Number(quotedFare)) ||
        Number(quotedFare) < 0)
    )
      return NextResponse.json(
        { error: "Enter the full-day fare before confirming." },
        { status: 400 },
      );
    if (
      status === "CONFIRMED" &&
      (vehicleNumber.length < 4 || vehicleNumber.length > 20)
    )
      return NextResponse.json(
        { error: "Enter a valid vehicle number." },
        { status: 400 },
      );
    if (
      status === "CONFIRMED" &&
      (driverPhone.replace(/\D/g, "").length < 7 || driverPhone.length > 20)
    )
      return NextResponse.json(
        { error: "Enter a valid driver phone number." },
        { status: 400 },
      );
    await connectDB();
    const { id } = await params;
    if (status === "CONFIRMED") {
      const pending = await FullDayBooking.findById(id)
        .select("vehicleOption date")
        .lean<{
          vehicleOption: import("mongoose").Types.ObjectId;
          date: string;
        }>();
      if (!pending)
        return NextResponse.json(
          { error: "Full-day request not found." },
          { status: 404 },
        );
      const vehicle = await VehicleOption.findOne({
        _id: pending.vehicleOption,
        active: true,
      })
        .select("_id")
        .lean();
      if (!vehicle)
        return NextResponse.json(
          { error: "This vehicle has been removed from available options." },
          { status: 409 },
        );
      const conflict = await FullDayBooking.exists({
        _id: { $ne: id },
        vehicleOption: pending.vehicleOption,
        date: pending.date,
        status: "CONFIRMED",
      });
      if (conflict)
        return NextResponse.json(
          { error: "This vehicle is already confirmed for that date." },
          { status: 409 },
        );
    }
    const request = await FullDayBooking.findByIdAndUpdate(
      id,
      {
        $set: {
          status,
          quotedFare: status === "CONFIRMED" ? Number(quotedFare) : null,
          vehicleNumber: status === "CONFIRMED" ? vehicleNumber : "",
          driverPhone: status === "CONFIRMED" ? driverPhone : "",
        },
      },
      { new: true, runValidators: true },
    );
    if (!request)
      return NextResponse.json(
        { error: "Full-day request not found." },
        { status: 404 },
      );
    return NextResponse.json({ request });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    )
      return NextResponse.json(
        { error: "This vehicle is already confirmed for that date." },
        { status: 409 },
      );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Could not update the request.",
      },
      { status: 503 },
    );
  }
}
