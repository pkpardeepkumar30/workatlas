import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionMenu } from "@/components/action-menu";
import { SUCCESS_FEEDBACK_MS, SuccessCheck } from "@/components/success-check";

describe("compact action and success controls", () => {
  it("renders a compact, accessible three-line action-menu trigger", () => {
    const html = renderToStaticMarkup(createElement(ActionMenu, { label: "Task actions" }, createElement("button", null, "Edit")));
    expect(html).toContain('aria-label="Task actions"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(html).toContain("lucide-menu");
    expect(html).not.toContain(">Edit<");
  });

  it("uses a small check confirmation with a two-second lifetime", () => {
    const html = renderToStaticMarkup(createElement(SuccessCheck, { show: true, label: "Task saved" }));
    expect(SUCCESS_FEEDBACK_MS).toBe(2_000);
    expect(html).toContain('role="status"');
    expect(html).toContain("lucide-check");
    expect(html).toContain("size-7");
  });
});
