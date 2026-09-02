import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // Excluye estáticos y assets del PWA para no romper instalación/offline.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|icons/|offline|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
