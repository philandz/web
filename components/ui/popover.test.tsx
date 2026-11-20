import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Popover } from "@/components/ui/popover";

afterEach(cleanup);

describe("Popover with the legacy trigger prop", () => {
  it("keeps the panel out of the page while closed", () => {
    render(
      <Popover trigger={<button type="button">bell</button>} open={false} onOpenChange={() => {}}>
        <div data-testid="panel">panel</div>
      </Popover>,
    );
    expect(screen.queryByTestId("panel")).toBeNull();
  });

  it("renders the panel in a positioned surface when open", () => {
    render(
      <Popover trigger={<button type="button">bell</button>} open onOpenChange={() => {}} align="end">
        <div data-testid="panel">panel</div>
      </Popover>,
    );
    const panel = screen.getByTestId("panel");
    const surface = panel.closest("[data-radix-popper-content-wrapper]") ?? panel.parentElement;
    expect(surface).not.toBeNull();
    expect(panel.parentElement?.className).toContain("bg-card");
  });
});
