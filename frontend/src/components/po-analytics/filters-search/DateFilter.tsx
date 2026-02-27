export type DateFilterMode = "year" | "month" | "day" | "range";

interface Props {
  mode: DateFilterMode;
  year: number;
  month: number;
  day: number;
  rangeStart: string;
  rangeEnd: string;
  years: number[];
  months: string[];
  days: number[];
  onModeChange: (mode: DateFilterMode) => void;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  onDayChange: (day: number) => void;
  onRangeStartChange: (value: string) => void;
  onRangeEndChange: (value: string) => void;
}

// Added appearance-none and a custom SVG background arrow
const selectClass =
  "bg-slate-50 border border-slate-200 rounded-lg px-3 pr-8 py-1.5 text-xs text-slate-600 font-bold focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-hidden transition-all appearance-none cursor-pointer";

// SVG Data URI for the custom chevron
const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='m19.5 8.25-7.5 7.5-7.5-7.5' /%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 0.5rem center",
  backgroundSize: "1rem",
};

export function DateFilter(props: Props) {
  const {
    mode,
    year,
    month,
    day,
    rangeStart,
    rangeEnd,
    years,
    months,
    days,
    onModeChange,
    onYearChange,
    onMonthChange,
    onDayChange,
    onRangeStartChange,
    onRangeEndChange,
  } = props;

  return (
    <div className="mb-6 pb-6 border-b border-slate-100">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1">
        Aging Reference Date
      </label>

      <div className="flex gap-4 flex-wrap items-center">
        {/* Segmented Control */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(["year", "month", "day", "range"] as DateFilterMode[]).map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all ${
                mode === m
                  ? "bg-white text-indigo-600 shadow-sm"
                  : "text-slate-400 hover:text-slate-500"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Dynamic Controls */}
        <div className="flex gap-2 items-center">
          {(mode === "year" || mode === "month" || mode === "day") && (
            <select
              style={chevronStyle}
              className={selectClass}
              value={year}
              onChange={(e) => onYearChange(+e.target.value)}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}

          {(mode === "month" || mode === "day") && (
            <select
              style={chevronStyle}
              className={selectClass}
              value={month}
              onChange={(e) => onMonthChange(+e.target.value)}
            >
              {months.map((m, i) => (
                <option key={m} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {mode === "day" && (
            <select
              style={chevronStyle}
              className={selectClass}
              value={day}
              onChange={(e) => onDayChange(+e.target.value)}
            >
              {days.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          )}

          {mode === "range" && (
            <div className="flex gap-2 items-center">
              <input
                type="date"
                value={rangeStart}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600"
                onChange={(e) => onRangeStartChange(e.target.value)}
              />
              <span className="text-slate-300 text-xs font-bold">—</span>
              <input
                type="date"
                value={rangeEnd}
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600"
                onChange={(e) => onRangeEndChange(e.target.value)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
