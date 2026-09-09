import { Suspense } from "react";
import Dashboard from "@/components/dashboard";

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-8 text-sm text-zinc-500">
          Loading…
        </div>
      }
    >
      <Dashboard />
    </Suspense>
  );
}
