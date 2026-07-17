"use client";

import { useState, type SelectHTMLAttributes } from "react";
import { Badge, inputClass } from "@/components/ui";
import { priorities, priorityConfig, type Priority } from "@/lib/priority-config";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority, className }: { priority: Priority; className?: string }) {
  const configuration = priorityConfig[priority];
  return <Badge className={cn("border", configuration.badgeClass, className)}>{configuration.label}</Badge>;
}

export function PrioritySelect({
  defaultValue = "medium",
  className,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "defaultValue"> & { defaultValue?: Priority }) {
  const [selected, setSelected] = useState<Priority>(defaultValue);
  return (
    <div>
      <select
        {...props}
        defaultValue={defaultValue}
        className={cn(inputClass, className)}
        onChange={(event) => {
          setSelected(event.target.value as Priority);
          props.onChange?.(event);
        }}
      >
        {priorities.map((priority) => <option key={priority} value={priority}>{priorityConfig[priority].label}</option>)}
      </select>
      <div className="mt-2" aria-live="polite"><PriorityBadge priority={selected} /></div>
    </div>
  );
}
