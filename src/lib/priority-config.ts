export const priorities = ["low", "medium", "high", "critical"] as const;
export type Priority = (typeof priorities)[number];

export const priorityConfig: Record<Priority, {
  label: string;
  badgeClass: string;
  indicatorClass: string;
  rank: number;
}> = {
  low: {
    label: "Low",
    badgeClass: "border-slate-300 bg-slate-100 text-slate-700",
    indicatorClass: "border-l-slate-400",
    rank: 1,
  },
  medium: {
    label: "Medium",
    badgeClass: "border-blue-300 bg-blue-100 text-blue-800",
    indicatorClass: "border-l-blue-500",
    rank: 2,
  },
  high: {
    label: "High",
    badgeClass: "border-amber-300 bg-amber-100 text-amber-900",
    indicatorClass: "border-l-amber-500",
    rank: 3,
  },
  critical: {
    label: "Urgent",
    badgeClass: "border-red-300 bg-red-100 text-red-800",
    indicatorClass: "border-l-red-600",
    rank: 4,
  },
};

export function getPriorityConfig(priority: Priority) {
  return priorityConfig[priority];
}
