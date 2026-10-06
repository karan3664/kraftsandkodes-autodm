import { fail, ok, type ApiResponse } from "@kdl/shared";
import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(ok(data), { status });
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
): NextResponse<ApiResponse<never>> {
  return NextResponse.json(fail(code, message), { status });
}

export async function readJson<T>(request: Request): Promise<T> {
  return (await request.json()) as T;
}
