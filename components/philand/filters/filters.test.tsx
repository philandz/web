import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enBudget from "@/locales/en/budget.json";
import { DateRangePicker } from "./date-range-picker";
import { SearchBox } from "./search-box";

afterEach(cleanup);

function withIntl(ui: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ budget: enBudget }} timeZone="UTC">
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("DateRangePicker", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 6, 9, 0)); // 06/11/2026 local
  });
  afterEach(() => vi.useRealTimers());

  it("shows the preset name with its real dates", () => {
    withIntl(
      <DateRangePicker
        value={{ range: "period:0", from: "2026-10-25", to: "2026-11-24" }}
        periodStartDay={25}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText("This period")).toBeInTheDocument();
    // en formats as month/day, vi as day/month: accept both, the point is the real dates show
    expect(screen.getByText(/(10\/25|25\/10)\s*–\s*(11\/24|24\/11)/)).toBeInTheDocument();
  });

  it("‹ and › step a period token", () => {
    const onChange = vi.fn();
    withIntl(
      <DateRangePicker
        value={{ range: "period:0", from: "2026-10-25", to: "2026-11-24" }}
        periodStartDay={25}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Previous range"));
    expect(onChange).toHaveBeenLastCalledWith({ range: "period:-1", from: "2026-09-25", to: "2026-10-24" });
    fireEvent.click(screen.getByLabelText("Next range"));
    expect(onChange).toHaveBeenLastCalledWith({ range: "period:1", from: "2026-11-25", to: "2026-12-24" });
  });

  it("steps a custom range by its own length", () => {
    const onChange = vi.fn();
    withIntl(
      <DateRangePicker
        value={{ range: "custom", from: "2026-11-03", to: "2026-11-12" }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Previous range"));
    expect(onChange).toHaveBeenLastCalledWith({ range: "custom", from: "2026-10-24", to: "2026-11-02" });
  });

  it("'All time' is open ended and cannot be stepped", () => {
    withIntl(<DateRangePicker value={{ range: "all", from: "", to: "" }} onChange={() => {}} />);
    expect(screen.getByLabelText("Previous range")).toBeDisabled();
    expect(screen.getByLabelText("Next range")).toBeDisabled();
  });

  it("offers the period presets only when the budget period does not start on the 1st", () => {
    const { unmount } = withIntl(
      <DateRangePicker value={{ range: "month:0", from: "2026-11-01", to: "2026-11-30" }} periodStartDay={1} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByLabelText("Date range"));
    expect(screen.queryByTestId("range-period:0")).toBeNull();
    expect(screen.getByTestId("range-month:-1")).toBeInTheDocument();
    unmount();

    withIntl(
      <DateRangePicker value={{ range: "period:0", from: "2026-10-25", to: "2026-11-24" }} periodStartDay={25} onChange={() => {}} />,
    );
    fireEvent.click(screen.getByLabelText("Date range"));
    expect(screen.getByTestId("range-period:-1")).toBeInTheDocument();
  });

  it("picking a preset applies it", () => {
    const onChange = vi.fn();
    withIntl(<DateRangePicker value={{ range: "month:0", from: "2026-11-01", to: "2026-11-30" }} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Date range"));
    fireEvent.click(screen.getByTestId("range-quarter:-1"));
    expect(onChange).toHaveBeenCalledWith({ range: "quarter:-1", from: "2026-07-01", to: "2026-09-30" });
  });

  it("cuts a custom range longer than 366 days and says so", () => {
    const onChange = vi.fn();
    withIntl(<DateRangePicker value={{ range: "custom", from: "2026-01-01", to: "2026-02-01" }} onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Date range"));
    fireEvent.change(screen.getAllByDisplayValue("2026-02-01")[0], { target: { value: "2028-01-01" } });
    expect(onChange).toHaveBeenLastCalledWith({ range: "custom", from: "2026-01-01", to: "2027-01-02" });
  });
});

describe("SearchBox", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("applies after the debounce, not on every keystroke", () => {
    const onCommit = vi.fn();
    render(<SearchBox value="" onCommit={onCommit} placeholder="Search" clearLabel="Clear" />);
    const input = screen.getByTestId("search-box");
    fireEvent.change(input, { target: { value: "co" } });
    fireEvent.change(input, { target: { value: "coffee" } });
    expect(onCommit).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit).toHaveBeenCalledWith("coffee");
  });

  it("applies on Enter right away and does not repeat an unchanged value", () => {
    const onCommit = vi.fn();
    render(<SearchBox value="" onCommit={onCommit} placeholder="Search" clearLabel="Clear" />);
    const input = screen.getByTestId("search-box");
    fireEvent.change(input, { target: { value: "rent" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onCommit).toHaveBeenCalledWith("rent");
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(onCommit).toHaveBeenCalledTimes(1);
  });

  it("follows the applied value when it is cleared from outside", () => {
    const { rerender } = render(<SearchBox value="rent" onCommit={() => {}} placeholder="Search" clearLabel="Clear" />);
    expect((screen.getByTestId("search-box") as HTMLInputElement).value).toBe("rent");
    rerender(<SearchBox value="" onCommit={() => {}} placeholder="Search" clearLabel="Clear" />);
    expect((screen.getByTestId("search-box") as HTMLInputElement).value).toBe("");
  });

  it("the clear button empties the box and applies at once", () => {
    const onCommit = vi.fn();
    render(<SearchBox value="rent" onCommit={onCommit} placeholder="Search" clearLabel="Clear" />);
    fireEvent.click(screen.getByLabelText("Clear"));
    expect(onCommit).toHaveBeenCalledWith("");
  });
});
