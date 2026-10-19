import { useCurrentFrame, useVideoConfig } from "remotion";
import { ToolCard } from "./ToolCard";
import {
  BRAND,
  TYPE,
  type Beat,
  type BeatSpan,
  type LineRaceStory as LineRaceData,
  type RaceTone,
  type ReelInput,
  type ReelPlan,
} from "../data";

// The plot keeps one position for the whole story, hook included, so the race
// never jumps when the hook text gives way to beat headings.
const PLOT = { left: 110, right: 740, top: 580, bottom: 1290 };

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const progress = (now: number, start: number, end: number) => ease((now - start) / Math.max(1, end - start));

function toneColor(tone: RaceTone) {
  if (tone === "teal") return BRAND.teal;
  if (tone === "amber") return BRAND.amber;
  return BRAND.ink;
}

function euro(value: number, step = 100) {
  return `€${(Math.round(value / step) * step).toLocaleString("en-GB")}`;
}

function xAt(index: number, count: number) {
  return PLOT.left + (index / Math.max(1, count - 1)) * (PLOT.right - PLOT.left);
}

function yAt(value: number, ceiling: number) {
  return PLOT.bottom - (value / ceiling) * (PLOT.bottom - PLOT.top);
}

/** Value at a fractional position, interpolating between plotted periods. */
function valueAt(values: number[], pos: number) {
  const i = Math.min(values.length - 1, Math.floor(pos));
  const next = Math.min(values.length - 1, i + 1);
  return values[i] + (values[next] - values[i]) * (pos - i);
}

function pathUpTo(values: number[], pos: number, ceiling: number) {
  const whole = Math.floor(pos);
  const points: string[] = [];
  for (let i = 0; i <= whole; i++) points.push(`${xAt(i, values.length)} ${yAt(values[i], ceiling)}`);
  if (pos > whole) points.push(`${xAt(pos, values.length)} ${yAt(valueAt(values, pos), ceiling)}`);
  return points.length > 1 ? `M${points.join(" L")}` : "";
}

function gapAreaUpTo(upper: number[], lower: number[], pos: number, ceiling: number) {
  const whole = Math.floor(pos);
  const top: string[] = [];
  const bottom: string[] = [];
  const indices = [...Array(whole + 1).keys()].map(Number);
  if (pos > whole) indices.push(pos);
  for (const i of indices) {
    top.push(`${xAt(i, upper.length)} ${yAt(valueAt(upper, i), ceiling)}`);
    bottom.unshift(`${xAt(i, lower.length)} ${yAt(valueAt(lower, i), ceiling)}`);
  }
  return top.length > 1 ? `M${top.join(" L")} L${bottom.join(" L")} Z` : "";
}

/**
 * Gap earned so far. `elapsed` runs from 0 to the number of periods, so the
 * total starts at 0 and only includes a period's gap as that period passes.
 */
function runningGap(upper: number[], lower: number[], elapsed: number) {
  const whole = Math.min(upper.length, Math.floor(elapsed));
  let total = 0;
  for (let i = 0; i < whole; i++) total += upper[i] - lower[i];
  if (whole < upper.length) total += (upper[whole] - lower[whole]) * (elapsed - whole);
  return total;
}

function raceBeat(input: ReelInput, stage: "race" | "finish") {
  return input.plan.beats.find((beat) => beat.anchor?.type === "race" && beat.anchor.stage === stage);
}

function spanOf(input: ReelInput, beat: Beat | undefined): BeatSpan | undefined {
  return beat ? input.beatSpans.find((span) => span.beatId === beat.id) : undefined;
}

function currentBeat(input: ReelInput, now: number) {
  const span = input.beatSpans.find((item) => now >= item.startMs && now < item.endMs);
  const beat = span ? input.plan.beats.find((item) => item.id === span.beatId) : undefined;
  return beat && span ? { beat, span } : undefined;
}

function RaceHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  // Card beats narrate the tool before the CTA shows it, so they keep a heading too.
  if (!active || (active.beat.anchor?.type !== "race" && active.beat.anchor?.type !== "card")) return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 105, opacity, transform: `translateY(${(1 - opacity) * 10}px)` }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 60, fontWeight: 800, lineHeight: 1.04, letterSpacing: "-0.035em", color: BRAND.ink }}>
        {active.beat.onscreenText}
      </div>
      {active.beat.subtext && (
        <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 620, lineHeight: 1.22, color: BRAND.inkSoft }}>
          {active.beat.subtext}
        </div>
      )}
    </div>
  );
}

function HookLines({ lines, top }: { lines: string[]; top: number }) {
  return (
    <div style={{ position: "absolute", left: 72, right: 90, top }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 74, fontWeight: 800, lineHeight: 1.0, letterSpacing: "-0.045em", color: BRAND.ink }}>
        {lines[0]}
      </div>
      {lines[1] && (
        <div style={{ marginTop: 18, fontFamily: TYPE.ui, fontSize: 44, fontWeight: 760, lineHeight: 1.08, letterSpacing: "-0.025em", color: BRAND.teal }}>
          {lines[1]}
        </div>
      )}
    </div>
  );
}

/**
 * The chart at a given race position. Shared by the moving story and the
 * static cover so both always draw the same thing.
 */
function RaceChart({ story, pos, finish }: { story: LineRaceData; pos: number; finish: number }) {
  const count = story.series[0]?.values.length ?? 0;
  const upper = story.gap ? story.series.find((s) => s.id === story.gap!.upper) : undefined;
  const lower = story.gap ? story.series.find((s) => s.id === story.gap!.lower) : undefined;
  const period = Math.min(count, Math.floor(pos) + 1);
  const ordered = [...story.series].sort((a, b) => valueAt(b.values, pos) - valueAt(a.values, pos));
  const headLabelOffset = (rank: number) => (rank === 0 ? -1 : 1);

  return (
    <svg viewBox="0 0 1080 1920" width="1080" height="1920" style={{ position: "absolute", inset: 0 }}>
      {story.gridlines.map((value) => (
        <g key={value}>
          <line x1={PLOT.left} y1={yAt(value, story.ceiling)} x2={PLOT.right} y2={yAt(value, story.ceiling)} stroke={BRAND.hairline} strokeWidth={2} strokeDasharray="5 12" />
          <text x={PLOT.left - 30} y={yAt(value, story.ceiling) + 8} textAnchor="end" fontFamily={TYPE.ui} fontSize={22} fontWeight={650} fill={BRAND.inkMuted}>
            {euro(value, 1000).replace(",000", "k")}
          </text>
        </g>
      ))}
      <line x1={PLOT.left} y1={PLOT.bottom} x2={PLOT.right} y2={PLOT.bottom} stroke={BRAND.inkMuted} strokeWidth={3} />
      <text x={PLOT.left - 30} y={PLOT.bottom + 8} textAnchor="end" fontFamily={TYPE.ui} fontSize={22} fontWeight={650} fill={BRAND.inkMuted}>€0</text>
      {[0, Math.floor((count - 1) / 2), count - 1].map((i) => (
        <text key={i} x={xAt(i, count)} y={PLOT.bottom + 40} textAnchor={i === 0 ? "start" : i === count - 1 ? "end" : "middle"} fontFamily={TYPE.ui} fontSize={24} fontWeight={650} fill={BRAND.inkMuted}>
          {story.periodLabel} {i + 1}
        </text>
      ))}

      {upper && lower && (
        <path d={gapAreaUpTo(upper.values, lower.values, pos, story.ceiling)} fill={BRAND.teal} opacity={0.13} />
      )}

      {story.series.map((series) => {
        const color = toneColor(series.tone);
        return (
          <g key={series.id}>
            <path d={pathUpTo(series.values, pos, story.ceiling)} fill="none" stroke={color} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
            {series.values.slice(0, Math.floor(pos) + 1).map((value, i) => {
              // The newest point pops in; older points settle to small dots.
              const age = pos - i;
              const r = age < 1 ? 5 + 6 * (1 - age) : 5;
              return <circle key={i} cx={xAt(i, count)} cy={yAt(value, story.ceiling)} r={r} fill={color} opacity={age < 1 ? 1 : 0.55} />;
            })}
          </g>
        );
      })}

      {ordered.map((series, rank) => {
        const color = toneColor(series.tone);
        const x = xAt(pos, count);
        const y = yAt(valueAt(series.values, pos), story.ceiling);
        const dir = headLabelOffset(rank);
        return (
          <g key={series.id}>
            <circle cx={x} cy={y} r={14} fill={BRAND.paper} stroke={color} strokeWidth={7} />
            <text x={x + 30} y={dir < 0 ? y - 42 : y + 56} fontFamily={TYPE.ui} fontSize={44} fontWeight={830} fill={color} style={{ fontVariantNumeric: "tabular-nums" }}>
              {euro(valueAt(series.values, pos))}
            </text>
            <text x={x + 30} y={dir < 0 ? y - 10 : y + 90} fontFamily={TYPE.ui} fontSize={27} fontWeight={720} fill={BRAND.inkSoft}>
              {series.label}
            </text>
          </g>
        );
      })}

      <text x={PLOT.right} y={PLOT.top - 30} textAnchor="end" fontFamily={TYPE.ui} fontSize={28} fontWeight={820} letterSpacing="0.12em" fill={BRAND.inkSoft} style={{ fontVariantNumeric: "tabular-nums" }}>
        {story.periodLabel.toUpperCase()} {period}
      </text>

      {upper && lower && finish > 0 && (() => {
        const x = PLOT.right + 6;
        const yTop = yAt(upper.values[count - 1], story.ceiling);
        const yBottom = yAt(lower.values[count - 1], story.ceiling);
        return (
          <g opacity={finish}>
            <line x1={x} y1={yTop} x2={x} y2={yBottom} stroke={BRAND.amber} strokeWidth={5} />
          </g>
        );
      })()}
    </svg>
  );
}

function GapCounter({ story, pos, finish }: { story: LineRaceData; pos: number; finish: number }) {
  if (!story.gap) return null;
  const upper = story.series.find((s) => s.id === story.gap!.upper);
  const lower = story.series.find((s) => s.id === story.gap!.lower);
  if (!upper || !lower) return null;
  // The lines sit on period points (0 to count - 1); the counter accrues over
  // count periods so it reads 0 at the start and the full total at the finish.
  const count = upper.values.length;
  const total = runningGap(upper.values, lower.values, (pos / Math.max(1, count - 1)) * count);
  return (
    <div style={{ position: "absolute", left: 72, right: 90, top: 1352 }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 28, fontWeight: 830, letterSpacing: "0.14em", color: BRAND.teal }}>
        {(finish >= 1 ? story.gap.finalLabel : story.gap.label).toUpperCase()}
      </div>
      <div style={{ marginTop: 6, fontFamily: TYPE.ui, fontSize: 104, fontWeight: 850, lineHeight: 1, letterSpacing: "-0.05em", color: BRAND.ink, fontVariantNumeric: "tabular-nums" }}>
        {finish >= 1 ? `About ${euro(total, 1000)}` : euro(total)}
      </div>
    </div>
  );
}

function ScopeLine({ story }: { story: LineRaceData }) {
  return (
    <div style={{ position: "absolute", left: 72, right: 110, top: 1500, fontFamily: TYPE.ui, fontSize: 29, fontWeight: 640, lineHeight: 1.3, color: BRAND.inkSoft }}>
      {story.scope}
    </div>
  );
}

export function LineRaceStory({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const story = input.plan.lineRace;
  if (!story) return null;
  const now = (frame / fps) * 1000;
  const count = story.series[0]?.values.length ?? 0;
  const hook = input.plan.hookVariants[input.plan.useHookVariant];

  // The race starts with the hook so something moves in the first second.
  // When the plan has a "finish" beat, the last point lands as that beat
  // starts, so the narration and the final number arrive together.
  const start = Math.max(0, input.hookSpan.startMs) + 150;
  const finishSpan = spanOf(input, raceBeat(input, "finish"));
  const nominalEnd = start + (count - 1) * story.secondsPerPeriod * 1000;
  const end = finishSpan ? Math.max(start + 4000, finishSpan.startMs + 150) : nominalEnd;
  const pos = clamp((now - start) / Math.max(1, end - start)) * (count - 1);
  const finish = progress(now, end, end + 600);
  const hookMode = now < input.hookSpan.endMs;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {hookMode && (
        <>
          <div style={{ position: "absolute", top: 150, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
          <HookLines lines={hook.onscreenLines.filter(Boolean)} top={230} />
        </>
      )}
      {!hookMode && <RaceHeading input={input} now={now} />}
      <RaceChart story={story} pos={pos} finish={finish} />
      <GapCounter story={story} pos={pos} finish={finish} />
      <ScopeLine story={story} />
    </div>
  );
}

export function LineRaceCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const story = input.plan.lineRace;
  const beat = input.plan.beats.find((b) => b.anchor?.type === "card");
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  if (!story) return null;
  const rows = Math.min(card?.rows.length ?? 0, 5);
  const tall = rows > 2;
  const cardTop = tall ? 180 : 280;
  const cardHeight = rows > 4 ? 620 : rows > 2 ? 560 : 410;
  const disclosureTop = card ? (tall ? cardTop + cardHeight + 18 : 720) : 300;
  const headingTop = card ? (tall ? cardTop + cardHeight + 100 : 785) : 420;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      {card && <div style={{ position: "absolute", left: 145, top: cardTop, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}><ToolCard card={card} compact /></div>}
      <div style={{ position: "absolute", left: 130, right: 150, top: disclosureTop, textAlign: "center", fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{story.disclosure}</div>
      <div style={{ position: "absolute", left: 70, right: 100, top: headingTop, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 108, lineHeight: 1.01, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 49, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>
      <div style={{ position: "absolute", left: 120, right: 160, top: 1235, paddingTop: 34, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 64, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 760, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

/** Static cover: the finished race with the hook and the final gap. */
export function LineRaceCover({ plan }: { plan: ReelPlan }) {
  const story = plan.lineRace;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  const count = story.series[0]?.values.length ?? 0;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: 150, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <HookLines lines={hook.onscreenLines.filter(Boolean)} top={230} />
      <RaceChart story={story} pos={count - 1} finish={1} />
      <GapCounter story={story} pos={count - 1} finish={1} />
      <ScopeLine story={story} />
      <div style={{ position: "absolute", left: 80, top: 1690, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>
    </div>
  );
}
