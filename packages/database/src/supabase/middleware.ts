import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "../types/database.types";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: {
            name: string;
            value: string;
            options: CookieOptions;
          }[],
        ) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do NOT use getSession() — it reads from storage
  // and is not guaranteed to be secure. Use getUser() instead.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes that don't require authentication
  const publicRoutes = ["/login", "/api/health", "/api/auth", "/customer", "/api/privacy"];
  const isPublicRoute = publicRoutes.some((route) =>
    pathname.startsWith(route),
  );

  if (!user && !isPublicRoute) {
    // Not authenticated — redirect to login
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    // Already authenticated — redirect based on role
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = data?.role ?? "customer";
    const url = request.nextUrl.clone();

    switch (role) {
      case "owner":
      case "manager":
        url.pathname = "/admin";
        break;
      case "cashier":
      case "waiter":
        url.pathname = "/pos";
        break;
      case "chef":
        url.pathname = "/kds";
        break;
      default:
        url.pathname = "/customer";
        break;
    }

    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
