import { fetchSchemes, fetchStats } from "@/lib/api";
import Dashboard from "@/components/Dashboard";

export default async function HomePage() {
  let schemes = [];
  let stats = null;

  try {
    [schemes, stats] = await Promise.all([fetchSchemes(), fetchStats()]);
  } catch {
    // Backend not running — Dashboard will show connection error
  }

  return <Dashboard initialSchemes={schemes} initialStats={stats} />;
}
