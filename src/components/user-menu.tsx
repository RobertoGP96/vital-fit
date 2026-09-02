"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dropdown } from "@heroui/react";
import {
  KeyRound,
  LogOut,
  ShieldCheck,
  UserCircle,
  UserCog,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { Avatar } from "@/components/avatar";

type Role = "admin" | "coordinator" | "trainer";

const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrador",
  coordinator: "Coordinador",
  trainer: "Entrenador",
};

export function UserMenu({ name, role }: { name: string; role: Role }) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const canManage = role === "admin" || role === "coordinator";
  const go = (href: string) => () => router.push(href);

  return (
    <Dropdown>
      <Dropdown.Trigger
        aria-label="Menú de usuario"
        className="rounded-full ring-offset-2 ring-offset-cream"
      >
        <Avatar name={name} size="sm" tone="solid" ring />
      </Dropdown.Trigger>

      <Dropdown.Popover
        placement="bottom end"
        className="min-w-60 rounded-2xl border border-line bg-white shadow-[0_16px_40px_rgba(11,31,20,0.14)]"
      >
        <div className="border-b border-ink/5 px-4 pb-3 pt-3.5">
          <p className="truncate text-sm font-bold text-ink">{name}</p>
          <p className="text-xs text-muted">{ROLE_LABEL[role]}</p>
        </div>

        <Dropdown.Menu aria-label="Opciones de la cuenta" className="p-1.5">
          <Dropdown.Item textValue="Mi cuenta" onAction={go("/mas")}>
            <ItemContent icon={<UserCircle size={16} />} label="Mi cuenta" />
          </Dropdown.Item>
          <Dropdown.Item
            textValue="Cambiar contraseña"
            onAction={go("/cambiar-contrasena")}
          >
            <ItemContent
              icon={<KeyRound size={16} />}
              label="Cambiar contraseña"
            />
          </Dropdown.Item>
          {canManage && (
            <Dropdown.Item
              textValue="Asignaciones de clientes"
              onAction={go("/gestion/asignaciones")}
            >
              <ItemContent
                icon={<UserCog size={16} />}
                label="Asignaciones de clientes"
              />
            </Dropdown.Item>
          )}
          {role === "admin" && (
            <Dropdown.Item
              textValue="Administración"
              onAction={go("/admin")}
            >
              <ItemContent
                icon={<ShieldCheck size={16} />}
                label="Administración"
              />
            </Dropdown.Item>
          )}
          <Dropdown.Item
            variant="danger"
            textValue="Cerrar sesión"
            onAction={() => startTransition(() => void logout())}
          >
            <ItemContent icon={<LogOut size={16} />} label="Cerrar sesión" />
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}

function ItemContent({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <span className="flex items-center gap-2.5 py-0.5">
      <span className="shrink-0 opacity-70">{icon}</span>
      <span className="font-medium">{label}</span>
    </span>
  );
}
