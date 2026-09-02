import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // No ejecutar lógica entre createServerClient y getClaims(): esta llamada
  // verifica el JWT y dispara el refresh de sesión si expiró.
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const path = request.nextUrl.pathname;

  const isPublic = path.startsWith("/login") || path.startsWith("/auth");

  if (!claims && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (claims) {
    const meta = (claims.app_metadata ?? {}) as Record<string, unknown>;
    const role = typeof meta.role === "string" ? meta.role : "trainer";

    // Contraseña temporal pendiente: bloquear todo excepto el cambio.
    if (
      meta.must_change_password === true &&
      !path.startsWith("/cambiar-contrasena")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/cambiar-contrasena";
      return NextResponse.redirect(url);
    }

    // Gates de cortesía (la autorización REAL vive en layouts + actions + RLS).
    if (path.startsWith("/admin") && role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/panel";
      return NextResponse.redirect(url);
    }
    if (
      path.startsWith("/gestion") &&
      role !== "admin" &&
      role !== "coordinator"
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/panel";
      return NextResponse.redirect(url);
    }

    if (path.startsWith("/login")) {
      const url = request.nextUrl.clone();
      url.pathname = "/panel";
      return NextResponse.redirect(url);
    }
  }

  // Devolver supabaseResponse tal cual: contiene las cookies refrescadas.
  return supabaseResponse;
}
