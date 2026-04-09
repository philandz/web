import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PageErrorState } from "@/components/state/page-error-state";

describe("PageErrorState", () => {
  it("renders an assertive alert with message", () => {
    render(<PageErrorState message="Something failed" />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveAttribute("aria-live", "assertive");
    expect(screen.getByText("Something failed")).toBeInTheDocument();
  });

  it("renders optional action", () => {
    render(<PageErrorState message="Something failed" action={<button>Retry</button>} />);

    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });
});
