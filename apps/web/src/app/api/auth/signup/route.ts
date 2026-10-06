import { NextRequest } from "next/server";
import { handleAuth } from "@/lib/auth/http";

export async function POST(request: NextRequest) {
  return handleAuth(request, "signup");
}
