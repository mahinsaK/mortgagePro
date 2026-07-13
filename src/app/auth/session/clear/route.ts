import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE,
  AUTH_SESSION_COOKIE_OPTIONS,
} from "@/backend/services/auth-session-service";

const SESSION_EXPIRED_MESSAGE = "Your session expired. Please sign in again.";

export async function GET(request: Request) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("status", "error");
  loginUrl.searchParams.set("message", SESSION_EXPIRED_MESSAGE);

  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.set(AUTH_SESSION_COOKIE, "", {
    ...AUTH_SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });

  return response;
}
