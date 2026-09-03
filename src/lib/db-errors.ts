/** Los triggers de negocio (aforo, límite de sesiones) redactan sus mensajes
    para el usuario final: se muestran tal cual; cualquier otro error de BD
    cae al mensaje genérico. */
export function dbRuleMessage(
  message: string | null | undefined,
  fallback: string,
): string {
  return message && /límite|aforo/i.test(message) ? message : fallback;
}
