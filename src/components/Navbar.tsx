import { Link, NavLink } from "react-router-dom";
import { PlaneTakeoff } from "lucide-react";

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-navy-800/10 bg-navy-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-gold-400">
            <PlaneTakeoff className="h-5 w-5 text-navy-950" strokeWidth={2.5} />
          </span>
          <span className="text-lg font-bold tracking-tight">Aerion</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-white/80">
          <NavLink to="/" end className={({ isActive }) => (isActive ? "text-white" : "hover:text-white")}>
            Book a flight
          </NavLink>
          <NavLink to="/manage" className={({ isActive }) => (isActive ? "text-white" : "hover:text-white")}>
            Manage booking
          </NavLink>
          <NavLink to="/track" className={({ isActive }) => (isActive ? "text-white" : "hover:text-white")}>
            Track a flight
          </NavLink>
          <NavLink
            to="/admin"
            className={({ isActive }) => (isActive ? "text-white" : "hover:text-white")}
          >
            Admin
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
