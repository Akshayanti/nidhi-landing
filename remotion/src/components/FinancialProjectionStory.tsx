import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type Beat,
  type BeatSpan,
  type ChartStage,
  type MultiplierRow,
  type MultiplierStage,
  type ReelInput,
  type ReelPlan,
} from "../data";

const HOOK_PLOT = { left: 90, right: 760, top: 540, bottom: 1270 };
const PLOT = { left: 90, right: 760, top: 500, bottom: 1360 };
const LABEL_X = 792;
type Plot = typeof PLOT;

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};

function progressBetween(now: number, start: number, end: number) {
  return ease((now - start) / Math.max(1, end - start));
}

function findSpan(input: ReelInput, beatId: string): BeatSpan {
  return input.beatSpans.find((span) => span.beatId === beatId) ?? {
    beatId,
    startMs: Number.POSITIVE_INFINITY,
    endMs: Number.POSITIVE_INFINITY,
  };
}

function findBeat(input: ReelInput, beatId: string): Beat | undefined {
  return input.plan.beats.find((beat) => beat.id === beatId);
}

function chartBeat(input: ReelInput, stage: ChartStage) {
  return input.plan.beats.find((beat) => beat.anchor?.type === "chart" && beat.anchor.stage === stage);
}

function multiplierBeat(input: ReelInput, stage: MultiplierStage) {
  return input.plan.beats.find((beat) => beat.anchor?.type === "multiplier" && beat.anchor.stage === stage);
}

function spanFor(input: ReelInput, beat: Beat | undefined, fallbackId: string) {
  return findSpan(input, beat?.id ?? fallbackId);
}

function growthSeries(start: number, monthly: number, years: number, ratePct: number) {
  const monthlyRate = Math.pow(1 + ratePct / 100, 1 / 12) - 1;
  const points = [start];
  let balance = start;
  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) {
      balance = balance * (1 + monthlyRate) + monthly;
    }
    points.push(balance);
  }
  return points;
}

function euro(value: number) {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(2)}M`;
  return `€${Math.round(value / 1000)}k`;
}

function pointAt(points: number[], progress: number, years: number, ceiling: number, plot: Plot = PLOT) {
  const position = clamp(progress) * years;
  const first = Math.floor(position);
  const second = Math.min(years, first + 1);
  const mix = position - first;
  const value = points[first] + (points[second] - points[first]) * mix;
  return {
    x: plot.left + (position / years) * (plot.right - plot.left),
    y: plot.bottom - (value / ceiling) * (plot.bottom - plot.top),
  };
}

function seriesPath(points: number[], years: number, ceiling: number, plot: Plot = PLOT) {
  return points
    .map((value, index) => {
      const x = plot.left + (index / years) * (plot.right - plot.left);
      const y = plot.bottom - (value / ceiling) * (plot.bottom - plot.top);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

function rangePath(high: number[], low: number[], years: number, ceiling: number, plot: Plot = PLOT) {
  const upper = high.map((value, index) => {
    const x = plot.left + (index / years) * (plot.right - plot.left);
    const y = plot.bottom - (value / ceiling) * (plot.bottom - plot.top);
    return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const lower = [...low].reverse().map((value, reverseIndex) => {
    const index = years - reverseIndex;
    const x = plot.left + (index / years) * (plot.right - plot.left);
    const y = plot.bottom - (value / ceiling) * (plot.bottom - plot.top);
    return `L${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  return [...upper, ...lower, "Z"].join(" ");
}

function tone(row: MultiplierRow) {
  if (row.tone === "amber") return BRAND.amber;
  if (row.tone === "teal") return BRAND.teal;
  return BRAND.ink;
}

function formatFactor(value: number) {
  return value.toLocaleString("en-GB");
}

function currentBeat(input: ReelInput, now: number) {
  const span = input.beatSpans.find((candidate) => now >= candidate.startMs && now < candidate.endMs);
  if (!span) return undefined;
  const beat = findBeat(input, span.beatId);
  return beat ? { beat, span } : undefined;
}

function BeatHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  if (!active || !["chart", "multiplier"].includes(active.beat.anchor?.type ?? "")) return null;
  if (active.beat.anchor?.type === "chart" && active.beat.anchor.stage === "gap") return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  const isSteps = active.beat.anchor?.type === "multiplier" && active.beat.anchor.stage === "steps";
  return (
    <div
      style={{
        position: "absolute",
        top: isSteps ? 236 : 238,
        left: 72,
        right: 112,
        opacity,
        transform: `translateY(${(1 - opacity) * 10}px)`,
        zIndex: 3,
      }}
    >
      <div
        style={{
          fontFamily: TYPE.ui,
          fontSize: isSteps ? 58 : 60,
          fontWeight: 800,
          color: BRAND.ink,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
        }}
      >
        {active.beat.onscreenText}
      </div>
      {active.beat.subtext && active.beat.anchor?.type !== "multiplier" && (
        <div
          style={{
            marginTop: 12,
            fontFamily: TYPE.ui,
            fontSize: 31,
            fontWeight: 600,
            color: BRAND.inkSoft,
            lineHeight: 1.25,
          }}
        >
          {active.beat.subtext}
        </div>
      )}
    </div>
  );
}

function ProjectionChart({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.chartStory;
  if (!story) return null;

  const hook = input.plan.hookVariants[input.plan.useHookVariant];
  const setupBeat = chartBeat(input, "setup");
  const b1 = spanFor(input, setupBeat, "b1");
  const b2 = spanFor(input, chartBeat(input, "single"), "b2");
  const b3 = spanFor(input, chartBeat(input, "input"), "b3");
  const b4 = spanFor(input, chartBeat(input, "mid"), "b4");
  const b5 = spanFor(input, chartBeat(input, "low"), "b5");
  const b6 = spanFor(input, chartBeat(input, "gap"), "b6");
  const b7 = spanFor(input, chartBeat(input, "range"), "b7");
  const b8 = spanFor(input, multiplierBeat(input, "blank"), "b8");
  const setupChips = setupBeat?.anchor?.type === "chart" ? setupBeat.anchor.chips ?? [] : [];

  const [lowRate, middleRate, highRate] = story.ratesPct;
  const low = growthSeries(story.start, story.monthly, story.years, lowRate);
  const middle = growthSeries(story.start, story.monthly, story.years, middleRate);
  const high = growthSeries(story.start, story.monthly, story.years, highRate);
  const lowEnd = pointAt(low, 1, story.years, story.ceiling);
  const middleEnd = pointAt(middle, 1, story.years, story.ceiling);
  const highEnd = pointAt(high, 1, story.years, story.ceiling);
  const hookLowEnd = pointAt(low, 1, story.years, story.ceiling, HOOK_PLOT);
  const hookMiddleEnd = pointAt(middle, 1, story.years, story.ceiling, HOOK_PLOT);
  const hookHighEnd = pointAt(high, 1, story.years, story.ceiling, HOOK_PLOT);

  const hookMode = now < input.hookSpan.endMs;
  const storyExit = progressBetween(now, b8.startMs, b8.startMs + 450);
  const bodyEnter = progressBetween(now, b1.startMs + 80, b1.startMs + 600);
  const lineHigh = progressBetween(now, b2.startMs + 250, b2.endMs - 350);
  const inputFocus = progressBetween(now, b3.startMs + 150, b3.startMs + 850);
  const lineMiddle = progressBetween(now, b4.startMs + 250, b4.endMs - 300);
  const lineLow = progressBetween(now, b5.startMs + 200, b5.endMs - 300);
  const gap = progressBetween(now, b6.startMs + 250, b6.startMs + 1200);
  const range = progressBetween(now, b7.startMs + 200, b7.startMs + 1100);

  const hookBracket = progressBetween(now, input.hookSpan.startMs + 250, input.hookSpan.startMs + 1050);
  const hookDetail = progressBetween(now, input.hookSpan.startMs + 650, input.hookSpan.startMs + 1500);
  const chartOpacity = 1 - storyExit;
  const activeInput = now < b4.startMs ? "8%" : now < b5.startMs ? "6%" : "4%";
  const inputTagOpacity = now >= b2.startMs && now < b5.endMs
    ? Math.min(
        progressBetween(now, b2.startMs + 100, b2.startMs + 500),
        1 - progressBetween(now, b5.endMs - 450, b5.endMs),
      )
    : 0;
  const editStart = now < b4.startMs ? b3.startMs : now < b5.startMs ? b4.startMs : b5.startMs;
  const editPhase = clamp((now - editStart) / 850);
  const tagScale = 1 + Math.sin(editPhase * Math.PI) * 0.1;
  const showCaret = inputFocus > 0.3 && inputFocus < 0.95 || editPhase < 0.78;
  const inputValueOpacity = now < b3.startMs ? 1 : 0.55 + progressBetween(now, editStart, editStart + 260) * 0.45;

  const dotHigh = pointAt(high, lineHigh, story.years, story.ceiling);
  const dotMiddle = pointAt(middle, lineMiddle, story.years, story.ceiling);
  const dotLow = pointAt(low, lineLow, story.years, story.ceiling);
  const pathHigh = seriesPath(high, story.years, story.ceiling);
  const pathMiddle = seriesPath(middle, story.years, story.ceiling);
  const pathLow = seriesPath(low, story.years, story.ceiling);
  const hookPathHigh = seriesPath(high, story.years, story.ceiling, HOOK_PLOT);
  const hookPathMiddle = seriesPath(middle, story.years, story.ceiling, HOOK_PLOT);
  const hookPathLow = seriesPath(low, story.years, story.ceiling, HOOK_PLOT);
  const highColor = lineMiddle > 0 ? BRAND.teal : BRAND.ink;

  return (
    <div style={{ position: "absolute", inset: 0, opacity: chartOpacity }}>
      {hookMode && (
        <div style={{ position: "absolute", inset: 0, zIndex: 2 }}>
          <div
            style={{
              position: "absolute",
              left: 72,
              top: 220,
              fontFamily: TYPE.ui,
              fontSize: 150,
              lineHeight: 0.92,
              fontWeight: 800,
              color: BRAND.ink,
              letterSpacing: "-0.065em",
              fontVariantNumeric: "tabular-nums",
              transform: `scale(${1.015 - hookDetail * 0.015})`,
              transformOrigin: "left center",
            }}
          >
            {hook.onscreenLines[0]}
          </div>
          <div
            style={{
              position: "absolute",
              left: 78,
              top: 374,
              fontFamily: TYPE.ui,
              fontSize: 53,
              fontWeight: 700,
              color: BRAND.ink,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            {hook.onscreenLines[1].split(/\s+/).map((word, index) => {
              const normal = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
              const emphasized = (hook.emphasis ?? []).some((item) => item.replace(/[^a-z0-9]/gi, "").toLowerCase() === normal);
              return <span key={`${word}-${index}`} style={{ color: emphasized ? BRAND.teal : BRAND.ink }}>{index > 0 ? " " : ""}{word}</span>;
            })}
          </div>
          <div
            style={{
              position: "absolute",
              left: 78,
              top: 448,
              fontFamily: TYPE.ui,
              fontSize: 31,
              fontWeight: 650,
              color: BRAND.inkSoft,
              opacity: hookDetail,
            }}
          >
            {hook.onscreenLines[2]}
          </div>
          <div
            style={{
              position: "absolute",
              top: 104,
              left: 76,
              fontFamily: TYPE.ui,
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "0.2em",
              color: BRAND.teal,
            }}
          >
            ILLUSTRATIVE
          </div>
        </div>
      )}

      {!hookMode && <BeatHeading input={input} now={now} />}

      <svg
        viewBox="0 0 1080 1920"
        width="1080"
        height="1920"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <clipPath id="hookEndings"><rect x="470" y="500" width="500" height="820" /></clipPath>
        </defs>

        {!hookMode && (
          <g opacity={bodyEnter * (1 - range * 0.25)}>
            {[1_000_000, 2_000_000].map((value) => {
              const y = PLOT.bottom - (value / story.ceiling) * (PLOT.bottom - PLOT.top);
              return (
                <g key={value}>
                  <line x1={PLOT.left} y1={y} x2={PLOT.right} y2={y} stroke={BRAND.hairline} strokeWidth={2} strokeDasharray="5 12" />
                  <text x={PLOT.left} y={y - 14} fontFamily={TYPE.ui} fontSize={25} fontWeight={650} fill={BRAND.inkMuted}>
                    {value === 1_000_000 ? "€1M" : "€2M"}
                  </text>
                </g>
              );
            })}
            <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke={BRAND.ink} strokeWidth={3} />
            {now < b2.startMs && <circle cx={PLOT.left} cy={PLOT.bottom - (story.start / story.ceiling) * (PLOT.bottom - PLOT.top)} r={13} fill={BRAND.ink} />}
            <text x={PLOT.left} y={PLOT.bottom + 45} fontFamily={TYPE.ui} fontSize={26} fontWeight={650} fill={BRAND.inkMuted}>Today</text>
            <text x={(PLOT.left + PLOT.right) / 2} y={PLOT.bottom + 45} textAnchor="middle" fontFamily={TYPE.ui} fontSize={26} fontWeight={650} fill={BRAND.inkMuted}>15 years</text>
            <text x={PLOT.right} y={PLOT.bottom + 45} textAnchor="end" fontFamily={TYPE.ui} fontSize={26} fontWeight={650} fill={BRAND.inkMuted}>30 years</text>
          </g>
        )}

        {(hookMode || lineLow > 0) && (
          <path d={rangePath(high, low, story.years, story.ceiling, hookMode ? HOOK_PLOT : PLOT)} fill={BRAND.teal} opacity={hookMode ? 0.05 : 0.08 * lineLow + 0.05 * range} />
        )}

        {hookMode ? (
          <g clipPath="url(#hookEndings)">
            <path d={hookPathLow} fill="none" stroke={BRAND.amber} strokeWidth={11} strokeLinecap="round" />
            <path d={hookPathMiddle} fill="none" stroke={BRAND.ink} strokeWidth={11} strokeLinecap="round" />
            <path d={hookPathHigh} fill="none" stroke={BRAND.teal} strokeWidth={11} strokeLinecap="round" />
          </g>
        ) : (
          <>
            <path d={pathHigh} pathLength={1} fill="none" stroke={highColor} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - lineHigh} />
            {lineHigh > 0 && lineHigh < 0.995 && <circle cx={dotHigh.x} cy={dotHigh.y} r={13} fill={highColor} />}
            <path d={pathMiddle} pathLength={1} fill="none" stroke={BRAND.ink} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - lineMiddle} />
            {lineMiddle > 0 && lineMiddle < 0.995 && <circle cx={dotMiddle.x} cy={dotMiddle.y} r={13} fill={BRAND.ink} />}
            <path d={pathLow} pathLength={1} fill="none" stroke={BRAND.amber} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1" strokeDashoffset={1 - lineLow} />
            {lineLow > 0 && lineLow < 0.995 && <circle cx={dotLow.x} cy={dotLow.y} r={13} fill={BRAND.amber} />}
          </>
        )}

        {(hookMode || lineHigh > 0.98) && <Endpoint x={hookMode ? hookHighEnd.x : highEnd.x} y={hookMode ? hookHighEnd.y : highEnd.y} value={euro(high.at(-1) ?? 0)} rate={`${highRate}% real`} color={hookMode ? BRAND.teal : highColor} opacity={hookMode ? 1 : lineHigh} />}
        {(hookMode || lineMiddle > 0.98) && <Endpoint x={hookMode ? hookMiddleEnd.x : middleEnd.x} y={hookMode ? hookMiddleEnd.y : middleEnd.y} value={euro(middle.at(-1) ?? 0)} rate={`${middleRate}% real`} color={BRAND.ink} opacity={hookMode ? 1 : lineMiddle} />}
        {(hookMode || lineLow > 0.98) && <Endpoint x={hookMode ? hookLowEnd.x : lowEnd.x} y={hookMode ? hookLowEnd.y : lowEnd.y} value={euro(low.at(-1) ?? 0)} rate={`${lowRate}% real`} color={BRAND.amber} opacity={hookMode ? 1 : lineLow} />}

        {(hookMode || gap > 0) && (
          <g opacity={hookMode ? hookBracket : gap}>
            <line x1={(hookMode ? HOOK_PLOT : PLOT).right + 8} y1={hookMode ? hookHighEnd.y : highEnd.y} x2={(hookMode ? HOOK_PLOT : PLOT).right + 8} y2={hookMode ? hookLowEnd.y : lowEnd.y} stroke={BRAND.amber} strokeWidth={5} />
            <line x1={(hookMode ? HOOK_PLOT : PLOT).right - 8} y1={hookMode ? hookHighEnd.y : highEnd.y} x2={(hookMode ? HOOK_PLOT : PLOT).right + 24} y2={hookMode ? hookHighEnd.y : highEnd.y} stroke={BRAND.amber} strokeWidth={5} />
            <line x1={(hookMode ? HOOK_PLOT : PLOT).right - 8} y1={hookMode ? hookLowEnd.y : lowEnd.y} x2={(hookMode ? HOOK_PLOT : PLOT).right + 24} y2={hookMode ? hookLowEnd.y : lowEnd.y} stroke={BRAND.amber} strokeWidth={5} />
          </g>
        )}
      </svg>

      {!hookMode && now < b2.startMs && (
        <div style={{ position: "absolute", top: 360, left: 76, right: 110, display: "flex", gap: 14, opacity: bodyEnter }}>
          {setupChips.map((chip) => (
            <div key={chip} style={{ flex: 1, padding: "18px 10px", border: `2px solid ${BRAND.ink}`, borderRadius: 16, background: "rgba(255,255,255,0.62)", fontFamily: TYPE.ui, fontSize: 28, fontWeight: 750, color: BRAND.ink, textAlign: "center" }}>
              {chip}
            </div>
          ))}
        </div>
      )}

      {inputTagOpacity > 0 && (
        <div
          style={{
            position: "absolute",
            top: 354,
            right: 128,
            padding: inputFocus > 0.2 ? "18px 26px" : "14px 22px",
            border: `3px solid ${BRAND.amber}`,
            borderRadius: 15,
            background: "rgba(250,247,242,0.96)",
            color: BRAND.ink,
            opacity: inputTagOpacity,
            transform: `scale(${tagScale})`,
            transformOrigin: "right center",
            fontFamily: TYPE.ui,
            zIndex: 4,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.17em", color: BRAND.amber }}>GROWTH INPUT</div>
          <div style={{ marginTop: 3, fontSize: 48, lineHeight: 1, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            <span style={{ opacity: inputValueOpacity }}>{activeInput}</span>{showCaret && Math.floor(now / 350) % 2 === 0 ? <span style={{ color: BRAND.amber }}>|</span> : null}
          </div>
        </div>
      )}

      {!hookMode && gap > 0 && now < b7.startMs && (
        <div style={{ position: "absolute", left: 112, top: 640, width: 330, opacity: gap }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 67, lineHeight: 1.02, fontWeight: 800, color: BRAND.ink, letterSpacing: "-0.045em" }}>€1.06M apart</div>
          <div style={{ marginTop: 8, fontFamily: TYPE.ui, fontSize: 30, lineHeight: 1.2, fontWeight: 650, color: BRAND.inkSoft }}>Nothing about Eva changed</div>
        </div>
      )}

      {!hookMode && (
        <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.32, fontWeight: 550, color: BRAND.inkMuted, opacity: bodyEnter }}>
          {story.disclosure}
        </div>
      )}
    </div>
  );
}

function Endpoint({ x, y, value, rate, color, opacity }: { x: number; y: number; value: string; rate: string; color: string; opacity: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={x} cy={y} r={14} fill={color} />
      <text x={LABEL_X} y={y + 7} fontFamily={TYPE.ui} fontSize={42} fontWeight={800} letterSpacing="-1.2" fill={color}>{value}</text>
      <text x={LABEL_X} y={y + 39} fontFamily={TYPE.ui} fontSize={23} fontWeight={650} fill={BRAND.inkSoft}>{rate}</text>
    </g>
  );
}

function MultiplierCard({ input, now }: { input: ReelInput; now: number }) {
  const beat8 = multiplierBeat(input, "blank");
  const beat9 = multiplierBeat(input, "example");
  const beat10 = multiplierBeat(input, "steps");
  const b8 = spanFor(input, beat8, "b8");
  const b9 = spanFor(input, beat9, "b9");
  const b10 = spanFor(input, beat10, "b10");
  if (now < b8.startMs) return null;

  const blank = beat8?.anchor?.type === "multiplier" ? beat8.anchor : undefined;
  const example = beat9?.anchor?.type === "multiplier" ? beat9.anchor : undefined;
  const stepsAnchor = beat10?.anchor?.type === "multiplier" ? beat10.anchor : undefined;
  const rows = example?.rows ?? blank?.rows ?? [];
  const inExample = now >= b9.startMs;
  const inSteps = now >= b10.startMs;
  const enter = progressBetween(now, b8.startMs, b8.startMs + 450);
  const exampleProgress = progressBetween(now, b9.startMs + 100, b9.startMs + 850);
  const stepsProgress = progressBetween(now, b10.startMs + 100, b10.startMs + 850);
  const scale = interpolate(stepsProgress, [0, 1], [1, 0.65]);
  const translateY = interpolate(stepsProgress, [0, 1], [0, -12]);
  const footnote = inExample ? example?.footnote : blank?.footnote;
  const rates = input.plan.chartStory?.ratesPct ?? [];
  const assumptionLine = rates.length > 0
    ? `Illustrative. 30 years at ${rates.map((rate) => `${rate}%`).join(", ")} real growth.`
    : "Illustrative.";

  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter }}>
      <BeatHeading input={input} now={now} />
      <div
        style={{
          position: "absolute",
          left: 82,
          top: 348,
          width: 886,
          height: 1060,
          border: `3px solid ${BRAND.ink}`,
          borderRadius: 28,
          background: "rgba(255,255,255,0.72)",
          boxShadow: "12px 14px 0 rgba(0,33,113,0.09)",
          overflow: "hidden",
          transform: `translateY(${translateY}px) scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        <div style={{ height: 134, padding: "24px 34px", background: BRAND.ink, color: BRAND.paper, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: TYPE.ui, fontSize: 20, fontWeight: 800, letterSpacing: "0.18em", color: "#9FE9DD" }}>MONTHLY INVESTING</div>
            <div style={{ marginTop: 8, fontFamily: TYPE.ui, fontSize: 38, fontWeight: 750 }}>
              {inExample ? `€${example?.monthly ?? 300} a month` : "€____ a month"}
            </div>
          </div>
          <div style={{ fontFamily: TYPE.ui, fontSize: 24, fontWeight: 700, color: "rgba(250,247,242,0.68)" }}>30 YEARS</div>
        </div>

        <div style={{ padding: "8px 34px 0" }}>
          {rows.map((row, index) => {
            const rowEnter = progressBetween(now, b8.startMs + 180 + index * 180, b8.startMs + 620 + index * 180);
            const resultEnter = inExample ? progressBetween(now, b9.startMs + 350 + index * 420, b9.startMs + 750 + index * 420) : 0;
            const result = example?.results?.[index] ?? "€____";
            return (
              <div
                key={`${row.label}-${row.factor}`}
                style={{
                  height: 252,
                  display: "grid",
                  gridTemplateColumns: "155px 1fr 220px",
                  alignItems: "center",
                  borderBottom: `2px solid ${BRAND.hairline}`,
                  opacity: rowEnter,
                  transform: `translateX(${(1 - rowEnter) * -20}px)`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 12, height: 76, borderRadius: 8, background: tone(row) }} />
                  <div style={{ fontFamily: TYPE.ui, fontSize: 28, fontWeight: 800, color: tone(row), textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.label}</div>
                </div>
                <div style={{ fontFamily: TYPE.ui, fontSize: 82, lineHeight: 1, fontWeight: 800, color: tone(row), letterSpacing: "-0.055em", fontVariantNumeric: "tabular-nums" }}>× {formatFactor(row.factor)}</div>
                <div style={{ fontFamily: TYPE.ui, fontSize: 54, lineHeight: 1, fontWeight: 800, color: tone(row), textAlign: "right", fontVariantNumeric: "tabular-nums", opacity: inExample ? 0.3 + resultEnter * 0.7 : 0.5 }}>
                  {inExample && resultEnter > 0.5 ? result : "€____"}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ position: "absolute", left: 34, right: 34, bottom: 22, fontFamily: TYPE.ui, fontSize: 21, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>
          <div style={{ fontWeight: 720, color: BRAND.inkSoft }}>{assumptionLine}</div>
          {footnote && <div style={{ marginTop: 5 }}>{footnote}</div>}
        </div>
      </div>

      {inSteps && (
        <div style={{ position: "absolute", left: 116, right: 150, top: 1050, display: "flex", flexDirection: "column", opacity: stepsProgress }}>
          {(stepsAnchor?.steps ?? []).map((step, index) => {
            const stepEnter = progressBetween(now, b10.startMs + 350 + index * 600, b10.startMs + 800 + index * 600);
            return (
              <div key={step} style={{ display: "grid", gridTemplateColumns: "64px 1fr", gap: 22, alignItems: "center", minHeight: 108, borderTop: `2px solid ${BRAND.hairline}`, opacity: stepEnter, transform: `translateY(${(1 - stepEnter) * 12}px)` }}>
                <div style={{ width: 54, height: 54, borderRadius: 27, background: index === 1 ? "rgba(194,65,12,0.12)" : "rgba(0,137,123,0.11)", color: index === 1 ? BRAND.amber : BRAND.teal, fontFamily: TYPE.ui, fontSize: 27, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{index + 1}</div>
                <div style={{ fontFamily: TYPE.ui, fontSize: 35, lineHeight: 1.14, fontWeight: 720, color: BRAND.ink }}>{step}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FinancialProjectionStory({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = (frame / fps) * 1000;
  return (
    <>
      <ProjectionChart input={input} now={now} />
      <MultiplierCard input={input} now={now} />
    </>
  );
}

export function FinancialProjectionCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progressBetween(frame, 0, fps * 0.45);
  const details = progressBetween(frame, fps * 0.35, fps * 0.9);
  const maker = progressBetween(frame, fps * 1.15, fps * 1.7);
  const example = multiplierBeat(input, "example");
  const anchor = example?.anchor?.type === "multiplier" ? example.anchor : undefined;
  const rows = anchor?.rows ?? [];
  const story = input.plan.chartStory;
  const assumptionLine = story
    ? `Illustrative. 30 years at ${story.ratesPct.map((rate) => `${rate}%`).join(", ")} real growth.`
    : "Illustrative.";

  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div
        style={{
          position: "absolute",
          top: 320,
          left: 150,
          width: 780,
          height: 440,
          padding: "28px 32px",
          borderRadius: 24,
          background: BRAND.paper,
          color: BRAND.ink,
          boxShadow: "14px 16px 0 rgba(0,0,0,0.18)",
          transform: `translateY(${(1 - enter) * 22}px) rotate(-1deg)`,
          opacity: enter,
        }}
      >
        <div style={{ fontFamily: TYPE.ui, fontSize: 21, fontWeight: 800, letterSpacing: "0.17em", color: BRAND.teal }}>30 YEAR MULTIPLIER</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 750 }}>€300 monthly</div>
        <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map((row, index) => (
            <div key={row.label} style={{ height: 82, display: "grid", gridTemplateColumns: "130px 1fr 165px", alignItems: "center", borderTop: `2px solid ${BRAND.hairline}`, color: tone(row) }}>
              <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em" }}>{row.label}</div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 43, fontWeight: 800 }}>× {formatFactor(row.factor)}</div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 39, fontWeight: 800, textAlign: "right" }}>{anchor?.results?.[index]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ position: "absolute", left: 130, right: 150, top: 785, textAlign: "center", fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{assumptionLine}</div>

      <div style={{ position: "absolute", left: 80, right: 120, top: 855, textAlign: "center", opacity: enter, transform: `translateY(${(1 - enter) * 16}px)` }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 120, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 54, lineHeight: 1.1, fontWeight: 750, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>

      <div style={{ position: "absolute", left: 120, right: 160, top: 1265, paddingTop: 34, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, lineHeight: 1.2, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 68, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 750, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

/** Static chart hook used by the reel cover. Essentials stay in the 3:4 crop. */
export function FinancialProjectionCover({ plan }: { plan: ReelPlan }) {
  const story = plan.chartStory;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;

  const coverPlot: Plot = { left: 90, right: 760, top: 650, bottom: 1320 };
  const [lowRate, middleRate, highRate] = story.ratesPct;
  const low = growthSeries(story.start, story.monthly, story.years, lowRate);
  const middle = growthSeries(story.start, story.monthly, story.years, middleRate);
  const high = growthSeries(story.start, story.monthly, story.years, highRate);
  const lowEnd = pointAt(low, 1, story.years, story.ceiling, coverPlot);
  const middleEnd = pointAt(middle, 1, story.years, story.ceiling, coverPlot);
  const highEnd = pointAt(high, 1, story.years, story.ceiling, coverPlot);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: 278, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>
        ILLUSTRATIVE
      </div>
      <div style={{ position: "absolute", left: 72, top: 350, fontFamily: TYPE.ui, fontSize: 150, lineHeight: 0.92, fontWeight: 800, color: BRAND.ink, letterSpacing: "-0.065em", fontVariantNumeric: "tabular-nums" }}>
        {hook.onscreenLines[0]}
      </div>
      <div style={{ position: "absolute", left: 78, top: 505, fontFamily: TYPE.ui, fontSize: 53, fontWeight: 700, color: BRAND.ink, lineHeight: 1.05, letterSpacing: "-0.03em" }}>
        {hook.onscreenLines[1].split(/\s+/).map((word, index) => {
          const normal = word.replace(/[^a-z0-9]/gi, "").toLowerCase();
          const emphasized = (hook.emphasis ?? []).some((item) => item.replace(/[^a-z0-9]/gi, "").toLowerCase() === normal);
          return <span key={`${word}-${index}`} style={{ color: emphasized ? BRAND.teal : BRAND.ink }}>{index > 0 ? " " : ""}{word}</span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 78, top: 578, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 650, color: BRAND.inkSoft }}>
        {hook.onscreenLines[2]}
      </div>

      <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <clipPath id="coverEndings"><rect x="440" y="620" width="530" height="760" /></clipPath>
          <linearGradient id="coverLineFade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="white" stopOpacity={0} />
            <stop offset="15%" stopColor="white" stopOpacity={1} />
            <stop offset="100%" stopColor="white" stopOpacity={1} />
          </linearGradient>
          <mask id="coverFadeMask" maskUnits="userSpaceOnUse" x="440" y="620" width="530" height="760">
            <rect x="440" y="620" width="530" height="760" fill="url(#coverLineFade)" />
          </mask>
        </defs>
        <path d={rangePath(high, low, story.years, story.ceiling, coverPlot)} fill={BRAND.teal} opacity={0.055} />
        <g clipPath="url(#coverEndings)" mask="url(#coverFadeMask)">
          <path d={seriesPath(low, story.years, story.ceiling, coverPlot)} fill="none" stroke={BRAND.amber} strokeWidth={11} strokeLinecap="round" />
          <path d={seriesPath(middle, story.years, story.ceiling, coverPlot)} fill="none" stroke={BRAND.ink} strokeWidth={11} strokeLinecap="round" />
          <path d={seriesPath(high, story.years, story.ceiling, coverPlot)} fill="none" stroke={BRAND.teal} strokeWidth={11} strokeLinecap="round" />
        </g>
        <Endpoint x={highEnd.x} y={highEnd.y} value={euro(high.at(-1) ?? 0)} rate={`${highRate}% real`} color={BRAND.teal} opacity={1} />
        <Endpoint x={middleEnd.x} y={middleEnd.y} value={euro(middle.at(-1) ?? 0)} rate={`${middleRate}% real`} color={BRAND.ink} opacity={1} />
        <Endpoint x={lowEnd.x} y={lowEnd.y} value={euro(low.at(-1) ?? 0)} rate={`${lowRate}% real`} color={BRAND.amber} opacity={1} />
        <line x1={coverPlot.right + 8} y1={highEnd.y} x2={coverPlot.right + 8} y2={lowEnd.y} stroke={BRAND.amber} strokeWidth={5} />
        <line x1={coverPlot.right - 8} y1={highEnd.y} x2={coverPlot.right + 24} y2={highEnd.y} stroke={BRAND.amber} strokeWidth={5} />
        <line x1={coverPlot.right - 8} y1={lowEnd.y} x2={coverPlot.right + 24} y2={lowEnd.y} stroke={BRAND.amber} strokeWidth={5} />
      </svg>

      <div style={{ position: "absolute", left: 80, top: 1560, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>
    </div>
  );
}
