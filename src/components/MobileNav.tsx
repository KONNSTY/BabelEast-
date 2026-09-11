"use client";

import { BookOpen, Headphones, Trophy, User } from "lucide-react";
import { cn } from "@/lib/cn";

const ITEMS = [
  { id: "learn", label: "Lernen", icon: BookOpen },
  { id: "coach", label: "Coach", icon: Headphones },
  { id: "quests", label: "Quests", icon: Trophy },
  { id: "profile", label: "Profil", icon: User },
] as const;

export type MobileNavId = (typeof ITEMS)[number]["id"];

export function MobileNav({ active, onSelect }: { active: MobileNavId; onSelect: (id: MobileNavId) => void }) {
  return (
    <nav
      aria-label="Hauptnavigation"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-100 bg-white/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-2">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <li key={id} className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(id)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "touch-target flex w-full flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-bold",
                  isActive ? "text-brand" : "text-slate-400",
                )}
              >
                <Icon size={22} fill={isActive ? "currentColor" : "none"} aria-hidden />
                {label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
