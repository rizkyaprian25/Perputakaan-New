import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, AlertTriangle, XCircle } from "lucide-react";
import { StatusEksemplar } from "@/contracts/konstanta";

interface BadgeStatusProps {
  status: StatusEksemplar | "terlambat";
  className?: string;
}

export function BadgeStatus({ status, className }: BadgeStatusProps) {
  const configs: Record<
    StatusEksemplar | "terlambat",
    { label: string; bg: string; text: string; icon: typeof CheckCircle2 }
  > = {
    tersedia: {
      label: "Tersedia",
      bg: "bg-status-tersedia/10 border-status-tersedia/20",
      text: "text-status-tersedia",
      icon: CheckCircle2,
    },
    dipinjam: {
      label: "Dipinjam",
      bg: "bg-status-dipinjam/10 border-status-dipinjam/20",
      text: "text-status-dipinjam",
      icon: Clock,
    },
    terlambat: {
      label: "Terlambat",
      bg: "bg-danger/10 border-danger/20",
      text: "text-danger",
      icon: AlertTriangle,
    },
    hilang: {
      label: "Hilang",
      bg: "bg-ink-muted/10 border-ink-muted/20",
      text: "text-ink-muted",
      icon: XCircle,
    },
    rusak: {
      label: "Rusak",
      bg: "bg-danger/10 border-danger/20",
      text: "text-danger",
      icon: AlertTriangle,
    },
  };

  const current = configs[status];
  const IconComponent = current.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium",
        current.bg,
        current.text,
        className
      )}
    >
      <IconComponent className="w-3.5 h-3.5 shrink-0" />
      <span>{current.label}</span>
    </span>
  );
}
