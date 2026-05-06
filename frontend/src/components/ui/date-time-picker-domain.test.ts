import { describe, expect, it } from "vitest";
import { addMonths, buildCalendarDays, buildHourOptions, buildMinuteOptions, composeDateTimeValue, getMonthLabel, parseDateTimeValue } from "./date-time-picker-domain";

describe("date-time-picker-domain", () => {
  it("parses and composes local datetime values", () => {
    expect(parseDateTimeValue("2026-05-06T07:15")).toEqual({ date: "2026-05-06", hour: "07", minute: "15" });
    expect(composeDateTimeValue({ date: "2026-05-06", hour: "09", minute: "30" })).toBe("2026-05-06T09:30");
  });

  it("keeps date empty until the user chooses a date", () => {
    expect(parseDateTimeValue()).toEqual({ date: "", hour: "07", minute: "00" });
    expect(composeDateTimeValue({ date: "", hour: "07", minute: "00" })).toBe("");
  });

  it("builds stable hour and stepped minute choices", () => {
    expect(buildHourOptions()).toHaveLength(24);
    expect(buildHourOptions()[0]).toBe("00");
    expect(buildHourOptions()[23]).toBe("23");
    expect(buildMinuteOptions(15)).toEqual(["00", "15", "30", "45"]);
  });

  it("builds a six-week custom calendar grid with selected and today state", () => {
    const days = buildCalendarDays(new Date(2026, 4, 1), "2026-05-06", new Date(2026, 4, 7));

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({ date: "2026-04-26", inCurrentMonth: false });
    expect(days.find((day) => day.date === "2026-05-06")).toMatchObject({ isSelected: true, inCurrentMonth: true });
    expect(days.find((day) => day.date === "2026-05-07")).toMatchObject({ isToday: true });
  });

  it("navigates month labels without native calendar dependency", () => {
    expect(getMonthLabel(new Date(2026, 4, 1))).toBe("Mei 2026");
    expect(addMonths(new Date(2026, 4, 1), -1).getMonth()).toBe(3);
    expect(addMonths(new Date(2026, 4, 1), 1).getMonth()).toBe(5);
  });
});
