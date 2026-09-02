import { createClient } from "@/lib/supabase/server";
import { PhotoUploader } from "@/components/photo-uploader";
import { PhotoGrid, type PhotoItem } from "@/components/photo-grid";

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
    .limit(60);

  const rows = data ?? [];
  let photos: PhotoItem[] = [];

  if (rows.length > 0) {
    // Bucket privado: URLs firmadas de corta vida (1 h).
    const { data: signed } = await supabase.storage
      .from("progress-photos")
      .createSignedUrls(
        rows.map((r) => r.storage_path),
        3600,
      );
    photos = rows.flatMap((r, i) => {
      const url = signed?.[i]?.signedUrl;
      return url
        ? [{ id: r.id, url, pose: r.pose, taken_on: r.taken_on, client_id: id }]
        : [];
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <PhotoUploader clientId={id} />
      <PhotoGrid photos={photos} />
    </div>
  );
}
