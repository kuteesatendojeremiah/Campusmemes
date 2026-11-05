export const TABS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/explore", label: "Explore", icon: "🧭" },
  { href: "/create", label: "Create", icon: "+" },
  { href: "/alerts", label: "Alerts", icon: "🔔" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));
