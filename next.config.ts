import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: supabaseHost }],
  },
  experimental: {
    // Router Cache para segmentos dinámicos (default 0): volver a una pestaña
    // visitada hace <30s es instantáneo. Los server actions con revalidatePath
    // siguen purgando este caché cuando los datos cambian.
    staleTimes: { dynamic: 30 },
    // El barrel de @heroui/react (~80 componentes "use client") no está en la
    // lista por defecto de Next; sin esto cada import arrastra el grafo entero.
    optimizePackageImports: ["@heroui/react"],
  },
};

export default nextConfig;
