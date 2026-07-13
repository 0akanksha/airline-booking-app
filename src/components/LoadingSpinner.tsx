import { PlaneTakeoff } from "lucide-react";

export default function LoadingSpinner() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-navy-700/50">
      <PlaneTakeoff className="h-8 w-8 animate-pulse" />
      <p>Loading&hellip;</p>
    </div>
  );
}
