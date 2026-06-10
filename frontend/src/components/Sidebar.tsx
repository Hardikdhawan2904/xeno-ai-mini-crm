"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "▦" },
  { href: "/customers", label: "Customers", icon: "👥" },
  { href: "/segments", label: "Segments", icon: "⬡" },
  { href: "/campaigns", label: "Campaigns", icon: "📣" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-slate-900 text-white flex flex-col shrink-0">
      <div className="px-6 py-5 border-b border-slate-700">
        <span className="font-bold text-lg tracking-tight text-indigo-400">Xeno CRM</span>
        <p className="text-xs text-slate-400 mt-0.5">Mini Campaign Manager</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map((link) => {
          const active = pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <span>{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-slate-700 text-xs text-slate-500">
        Xeno Internship Assignment
      </div>
    </aside>
  );
}
