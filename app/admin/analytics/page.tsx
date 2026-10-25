import AnalyticsDashboard from "@/components/AnalyticsDashboard";

export const metadata = {
  title: "Site analytics",
  robots: { index: false, follow: false },
};

export default function AnalyticsPage() {
  return <AnalyticsDashboard />;
}
