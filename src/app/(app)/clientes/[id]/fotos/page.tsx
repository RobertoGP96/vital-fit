import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotosSection, type PhotoItem } from "@/components/photos-section";

// URLs firmadas ESTABLES entre renders: si se re-firmara en cada visita, el
// token cambiaría, la caché HTTP del navegador (por URL) fallaría siempre y la
// galería entera se re-descargaría. Se firma con el cliente admin porque
// dentro de unstable_cache no hay cookies del request; la autorización ya la
// hizo la query RLS a progress_photos, de donde salen los paths (que forman
// parte de la clave de caché: fotos nuevas → clave nueva → firma fresca).
const getSignedPhotoUrls = unstable_cache(
  async (paths: string[]) => {
    const admin = createAdminClient();
    const { data } = await admin.storage
      .from("progress-photos")
      .createSignedUrls(paths, 86400);
    return (data ?? []).map((d) => d.signedUrl || null);
  },
  ["signed-photo-urls"],
  { revalidate: 3600 },
);

export default async function FotosPage(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("progress_photos")
    .select("id, storage_path, pose, taken_on")
    .eq("client_id", id)
    .order("taken_on", { ascending: false })
    // Con fotos antiguas cargadas a posteriori puede haber varias filas con la
    // misma taken_on: el desempate fija un orden estable entre renders.
    .order("created_at", { ascending: false })
    .limit(120);

  const rows = data ?? [];
  let photos: PhotoItem[] = [];

  if (rows.length > 0) {
    const signed = await getSignedPhotoUrls(rows.map((r) => r.storage_path));
    photos = rows.flatMap((r, i) => {
      const url = signed[i];
      return url
        ? [{ id: r.id, url, pose: r.pose, taken_on: r.taken_on, client_id: id }]
        : [];
    });
  }

  return (
    <PhotosSection
      photos={photos}
      // key: React exige key al elemento (serializado desde RSC) que
      // PhotosSection recoloca condicionalmente entre galería y comparador.
      uploader={<PhotoUploader key="uploader" clientId={id} />}
    />
  );
}
