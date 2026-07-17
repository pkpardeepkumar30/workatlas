import { AiPlanner } from "@/components/ai-planner";

export default function AssistantPage() {
  return (
    <div>
      <p className="text-sm font-semibold text-indigo-600">Optional integration</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">AI project planner</h1>
      <p className="mt-2 mb-8 max-w-3xl text-slate-500">
        Ask for prioritisation, task decomposition or a portfolio review. The integration is intentionally read-only.
      </p>
      <AiPlanner />
    </div>
  );
}
