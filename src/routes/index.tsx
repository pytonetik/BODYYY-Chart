import { createFileRoute } from "@tanstack/react-router";
import { ChartApp } from "@/components/chart/chart-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ChartApp />;
}
