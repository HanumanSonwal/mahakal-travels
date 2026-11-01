import {
  createSessionToken,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { User } from "@/lib/models";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json(),
      email = String(body.email || "")
        .trim()
        .toLowerCase(),
      password = String(body.password || "");
    await connectDB();
    const user = await User.findOne({ email, role: "customer" });
    if (!user || !(await verifyPassword(password, user.passwordHash)))
      return NextResponse.json(
        { error: "Email or password is incorrect." },
        { status: 401 },
      );
    const response = NextResponse.json({
      user: { name: user.name, email: user.email, phone: user.phone || "" },
    });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken(
        { id: user.id, name: user.name, email: user.email },
        "customer",
      ),
      sessionCookieOptions(),
    );
    return response;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not sign in." },
      { status: 503 },
    );
  }
}
