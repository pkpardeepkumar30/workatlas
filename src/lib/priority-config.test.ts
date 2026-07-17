import { describe, expect, it } from "vitest";
import { priorities, priorityConfig } from "@/lib/priority-config";

describe("priority configuration", () => {
  it("maps every stored value to visible text and colour classes", () => {
    expect(Object.keys(priorityConfig)).toEqual(priorities);
    expect(priorityConfig.critical.label).toBe("Urgent");
    for (const priority of priorities) {
      expect(priorityConfig[priority].label).toBeTruthy();
      expect(priorityConfig[priority].badgeClass).toContain("text-");
      expect(priorityConfig[priority].indicatorClass).toContain("border-l-");
    }
  });
});
