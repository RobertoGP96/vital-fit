import { redirect } from "next/navigation";

// La gestión de servicios y tarifas vive ahora en /gestion/servicios,
// accesible también para el coordinador (migración 0027).
export default function PlanesPage() {
  redirect("/gestion/servicios");
}
