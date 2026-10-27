import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AmountInput } from "@/components/ui/amount-input";

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

afterEach(cleanup);

const getInput = () => screen.getByLabelText("Amount input");

describe("AmountInput shorthand", () => {
  it("commits a valid shorthand", () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);

    fireEvent.change(getInput(), { target: { value: "50k" } });
    fireEvent.blur(getInput());

    expect(onChange).toHaveBeenCalledWith("50000");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("clears the field and reports an error for an unreadable shorthand", () => {
    const onChange = vi.fn();
    const { container } = render(<AmountInput value="50000" onChange={onChange} />);

    fireEvent.change(getInput(), { target: { value: "1t" } });
    fireEvent.blur(getInput());

    // the previous amount is dropped so it cannot be submitted silently
    expect(onChange).toHaveBeenCalledWith("");
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(container.querySelector("[data-invalid]")).toBeTruthy();
    expect(getInput()).toHaveAttribute("aria-invalid", "true");
  });

  it("recovers when the user types a valid amount again", () => {
    const onChange = vi.fn();
    render(<AmountInput value="" onChange={onChange} />);

    fireEvent.change(getInput(), { target: { value: "abc" } });
    fireEvent.blur(getInput());
    expect(screen.getByRole("alert")).toBeInTheDocument();

    fireEvent.change(getInput(), { target: { value: "1000" } });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(onChange).toHaveBeenLastCalledWith("1000");
  });
});
