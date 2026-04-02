import { NavLink, Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

const links = [
  { to: "/", label: "Overview" },
  { to: "/yearly", label: "Yearly breakdown" },
  { to: "/timeline", label: "AI & economic timeline" },
  { to: "/about", label: "About" },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Tech layoffs and macro context
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              2020–2025 · exploratory views · counts from reported layoff events
            </p>
          </div>
          <nav className="flex flex-wrap gap-x-4 gap-y-2 text-sm" aria-label="Primary">
            {links.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  cn(
                    "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
                    isActive && "font-medium text-foreground underline"
                  )
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <Separator />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
