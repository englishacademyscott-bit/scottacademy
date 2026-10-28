import { requireRole } from "@/lib/guards";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRole(["ADMIN"]);

  return <div className="space-y-6">{children}</div>;
}
