"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  WalletCards,
  CreditCard,
  Tags,
  Mails,
  ArrowRightLeft,
  Target,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Lançamentos", href: "/transactions", icon: ArrowRightLeft },
  { name: "Contas", href: "/accounts", icon: WalletCards },
  { name: "Cartões", href: "/cards", icon: CreditCard },
  { name: "Categorias", href: "/categories", icon: Tags },
  { name: "Envelopes", href: "/envelopes", icon: Mails },
  { name: "Objetivos", href: "/goals", icon: Target },
];

export function Sidebar({ mobile }: { mobile?: boolean }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex h-full w-64 flex-col bg-muted/40", !mobile && "border-r")}>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
