import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type Beat,
  type BeatSpan,
  type MonthCardRow,
  type MonthFormulaCard,
  type MonthStage,
  type MonthStory as MonthStoryData,
  type ReelInput,
  type ReelPlan,
} from "../data";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const progress = (now: number, start: number, end: number) => ease((now - start) / Math.max(1, end - start));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

type CalendarStory = Extract<MonthStoryData, { mode?: "calendar" }>;
type RunwayStory = Extract<MonthStoryData, { mode: "runway" }>;

const isRunway = (story: MonthStoryData): story is RunwayStory => story.mode === "runway";

function formatEuro(value: number) {
  return `€${Math.round(value).toLocaleString("en-GB")}`;
}

function toneColor(tone?: MonthCardRow["tone"]) {
  if (tone === "amber") return BRAND.amber;
  if (tone === "teal") return BRAND.teal;
  if (tone === "muted") return "#8491A8";
  return BRAND.ink;
}

function findBeat(input: ReelInput, predicate: (beat: Beat) => boolean) {
  return input.plan.beats.find(predicate);
}

function monthBeats(input: ReelInput, stage: MonthStage) {
  return input.plan.beats.filter((beat) => beat.anchor?.type === "months" && beat.anchor.stage === stage);
}

function monthBeat(input: ReelInput, stage: MonthStage) {
  return findBeat(input, (beat) => beat.anchor?.type === "months" && beat.anchor.stage === stage);
}

function spanFor(input: ReelInput, beat: Beat | undefined, fallbackId: string): BeatSpan {
  return input.beatSpans.find((span) => span.beatId === beat?.id)
    ?? input.beatSpans.find((span) => span.beatId === fallbackId)
    ?? { beatId: fallbackId, startMs: Number.POSITIVE_INFINITY, endMs: Number.POSITIVE_INFINITY };
}

function currentBeat(input: ReelInput, now: number) {
  const span = input.beatSpans.find((item) => now >= item.startMs && now < item.endMs);
  const beat = span ? input.plan.beats.find((item) => item.id === span.beatId) : undefined;
  return beat && span ? { beat, span } : undefined;
}

function MonthHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  if (!active || active.beat.anchor?.type !== "months") return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 105, opacity, transform: `translateY(${(1 - opacity) * 10}px)`, zIndex: 6 }}>
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

type CalendarMode = "normal" | "short" | "average" | "smoothed";

function AverageLadder({
  width,
  left,
  right,
  reference,
  average,
  budget,
}: {
  width: number;
  left: number;
  right: number;
  reference: number;
  average: number;
  budget: number;
}) {
  const top = 155;
  const bottom = 625;
  const range = Math.max(1, reference - budget);
  const ladderY = (value: number) => top + ((reference - value) / range) * (bottom - top);
  const payY = ladderY(reference);
  const averageY = ladderY(average);
  const budgetY = ladderY(budget);
  const rightEdge = width - right;
  const realSaving = Math.max(0, reference - average);
  const paperSaving = Math.max(0, reference - budget);
  return (
    <g>
      <rect x={left} y={payY} width={rightEdge - left} height={averageY - payY} fill={BRAND.amber} opacity={0.1} />
      <rect x={left} y={averageY} width={rightEdge - left} height={budgetY - averageY} fill={BRAND.ink} opacity={0.045} />

      <line x1={left} y1={payY} x2={rightEdge} y2={payY} stroke={BRAND.teal} strokeWidth={7} />
      <text x={left + 10} y={payY - 25} fontFamily={TYPE.ui} fontSize={34} fontWeight={850} fill={BRAND.teal}>Pay {formatEuro(reference)}</text>

      <line x1={left} y1={averageY} x2={rightEdge} y2={averageY} stroke={BRAND.amber} strokeWidth={7} />
      <text x={left + 10} y={averageY - 22} fontFamily={TYPE.ui} fontSize={34} fontWeight={850} fill={BRAND.amber}>Average cost {formatEuro(average)}</text>

      <line x1={left} y1={budgetY} x2={rightEdge} y2={budgetY} stroke={BRAND.ink} strokeWidth={5} strokeDasharray="14 12" />
      <text x={left + 10} y={budgetY + 48} fontFamily={TYPE.ui} fontSize={34} fontWeight={850} fill={BRAND.ink}>Budget {formatEuro(budget)}</text>

      <path d={`M${rightEdge - 12} ${payY} h-16 M${rightEdge - 12} ${payY} V${averageY} M${rightEdge - 12} ${averageY} h-16`} fill="none" stroke={BRAND.amber} strokeWidth={5} />
      <text x={rightEdge - 42} y={(payY + averageY) / 2 + 11} textAnchor="end" fontFamily={TYPE.ui} fontSize={31} fontWeight={850} fill={BRAND.amber}>{formatEuro(realSaving)} saved</text>

      <path d={`M${rightEdge - 270} ${payY} h-16 M${rightEdge - 270} ${payY} V${budgetY} M${rightEdge - 270} ${budgetY} h-16`} fill="none" stroke={BRAND.ink} strokeWidth={5} strokeDasharray="10 8" />
      <text x={rightEdge - 300} y={(payY + budgetY) / 2 + 11} textAnchor="end" fontFamily={TYPE.ui} fontSize={31} fontWeight={850} fill={BRAND.ink}>{formatEuro(paperSaving)} on paper</text>
    </g>
  );
}

function CalendarBars({
  story,
  values,
  mode = "normal",
  annotatedMonths = [],
  annotationOpacity = 1,
  top = 490,
  height = 805,
  opacity = 1,
}: {
  story: CalendarStory;
  values: number[];
  mode?: CalendarMode;
  annotatedMonths?: string[];
  annotationOpacity?: number;
  top?: number;
  height?: number;
  opacity?: number;
}) {
  const bars = story.bars.slice(0, 12);
  const baseline = story.baseline ?? Math.min(...bars.map((bar) => bar.value));
  const reference = story.reference?.value;
  const ceilingBase = Math.max(
    1,
    reference ?? 0,
    story.smoothed ?? 0,
    ...bars.map((bar) => bar.value),
    ...values,
  );
  const ceiling = ceilingBase * 1.12;
  const width = 936;
  const viewHeight = 805;
  const left = 18;
  const right = 20;
  const plotTop = 105;
  const plotBottom = 690;
  const plotHeight = plotBottom - plotTop;
  const slot = (width - left - right) / Math.max(1, bars.length);
  const barWidth = Math.min(48, slot * 0.62);
  const y = (value: number) => plotBottom - (value / ceiling) * plotHeight;
  const baselineY = y(baseline);
  const referenceY = reference === undefined ? null : y(reference);
  const averageY = story.smoothed === undefined ? null : y(story.smoothed);

  return (
    <div style={{ position: "absolute", left: 72, top, width, height, opacity }}>
      <svg viewBox={`0 0 ${width} ${viewHeight}`} width={width} height={height}>
        <line x1={left} y1={plotBottom} x2={width - right} y2={plotBottom} stroke={BRAND.ink} strokeWidth={3} opacity={mode === "average" ? 0 : 1} />

        {bars.map((bar, index) => {
          const value = values[index] ?? bar.value;
          const x = left + slot * index + (slot - barWidth) / 2;
          const topY = y(value);
          const hasLump = Boolean(bar.lump);
          const baseTopY = y(hasLump ? Math.min(value, baseline) : value);
          const extraTopY = y(Math.max(baseline, value));
          const normalColor = bar.tone ? toneColor(bar.tone) : BRAND.ink;
          const isSmooth = mode === "smoothed";
          const extraColor = isSmooth ? BRAND.teal : BRAND.amber;
          const shortTop = reference === undefined ? value : Math.max(reference, value);
          const shortY = y(shortTop);
          const shortHeight = reference === undefined || referenceY === null || value <= reference ? 0 : referenceY - topY;
          const highlighted = annotatedMonths.includes(bar.month);
          const annotation = annotatedMonths.includes(bar.month) ? bar.lump : undefined;
          const annotationRank = annotatedMonths.indexOf(bar.month);
          const edgeAnchor = index === 0 ? "start" : index === bars.length - 1 ? "end" : "middle";
          const edgeX = index === 0 ? left + 2 : index === bars.length - 1 ? width - right - 2 : x + barWidth / 2;
          const annotationLane = ((annotatedMonths.length - 1 - annotationRank) % 3 + 3) % 3;
          const annotationY = 28 + annotationLane * 76;
          const leaderEndY = Math.min(topY - 18, annotationY + 48);
          return (
            <g key={`${bar.month}-${index}`}>
              <rect x={x} y={baseTopY} width={barWidth} height={Math.max(0, plotBottom - baseTopY)} rx={10} fill={isSmooth ? BRAND.teal : normalColor} opacity={mode === "average" ? 0 : 1} />
              {hasLump && value > baseline && (
                <rect x={x} y={extraTopY} width={barWidth} height={Math.max(0, baselineY - extraTopY)} rx={10} fill={extraColor} opacity={mode === "average" ? 0 : 1} />
              )}
              {mode === "short" && shortHeight > 0 && (
                <rect x={x - 3} y={shortY} width={barWidth + 6} height={shortHeight} rx={9} fill={BRAND.amber} />
              )}
              {mode === "short" && index === 0 && shortHeight > 0 && (
                <g>
                  <line x1={x + barWidth / 2} y1={topY - 8} x2={x + barWidth / 2} y2={topY - 54} stroke={BRAND.amber} strokeWidth={3} />
                  <text x={left + 2} y={topY - 70} textAnchor="start" fontFamily={TYPE.ui} fontSize={30} fontWeight={850} fill={BRAND.amber}>{formatEuro(value - (reference ?? value))} short</text>
                </g>
              )}
              {annotation && (
                <g opacity={annotationOpacity}>
                  <line x1={x + barWidth / 2} y1={topY - 7} x2={x + barWidth / 2} y2={leaderEndY} stroke={BRAND.amber} strokeWidth={3} />
                  <text x={edgeX} y={annotationY} textAnchor={edgeAnchor} fontFamily={TYPE.ui} fontSize={27} fontWeight={820} fill={BRAND.ink}>
                    <tspan x={edgeX}>{annotation.label}</tspan>
                    <tspan x={edgeX} dy={31} fill={BRAND.amber}>{formatEuro(annotation.amount)}</tspan>
                  </text>
                </g>
              )}
              {highlighted && !annotation && (
                <rect x={x - 5} y={topY - 5} width={barWidth + 10} height={plotBottom - topY + 10} rx={13} fill="none" stroke={BRAND.amber} strokeWidth={5} />
              )}
              {mode !== "average" && <text x={x + barWidth / 2} y={plotBottom + 45} textAnchor="middle" fontFamily={TYPE.ui} fontSize={25} fontWeight={highlighted ? 850 : 720} fill={highlighted ? BRAND.amber : BRAND.inkMuted}>{bar.month}</text>}
            </g>
          );
        })}

        {referenceY !== null && mode !== "average" && (
          <g>
            <line x1={left} y1={referenceY} x2={width - right} y2={referenceY} stroke={BRAND.teal} strokeWidth={5} />
            <rect x={width - 210} y={referenceY - 42} width={190} height={34} rx={17} fill={BRAND.paper} opacity={0.94} />
            <text x={width - 28} y={referenceY - 18} textAnchor="end" fontFamily={TYPE.ui} fontSize={30} fontWeight={850} fill={BRAND.teal}>{story.reference?.label}</text>
          </g>
        )}

        {mode === "average" && (
          <AverageLadder width={width} left={left} right={right} reference={reference ?? 0} average={story.smoothed ?? 0} budget={baseline} />
        )}

        {mode === "smoothed" && averageY !== null && (
          <text x={left + 8} y={(referenceY ?? averageY) - 18} textAnchor="start" fontFamily={TYPE.ui} fontSize={29} fontWeight={850} fill={BRAND.teal}>Every month {formatEuro(story.smoothed ?? 0)}</text>
        )}
      </svg>
    </div>
  );
}

function CalendarHook({ story, plan, cover = false }: { story: CalendarStory; plan: ReelPlan; cover?: boolean }) {
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  const chartTop = cover ? 690 : 470;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 86, top: cover ? 360 : 184 }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: cover ? 59 : 72, fontWeight: 830, lineHeight: 1.04, letterSpacing: "-0.04em", color: BRAND.ink }}>{hook.onscreenLines[0]}</div>
        <div style={{ marginTop: 18, fontFamily: TYPE.ui, fontSize: cover ? 54 : 66, fontWeight: 820, lineHeight: 1.05, letterSpacing: "-0.035em", color: BRAND.amber }}>{hook.onscreenLines[1]}</div>
      </div>
      <CalendarBars story={story} values={story.bars.map((bar) => bar.value)} mode="short" top={chartTop} height={cover ? 735 : 900} />
      {hook.onscreenLines[2] && (
        <div style={{ position: "absolute", left: 78, top: cover ? 1500 : 1408, fontFamily: TYPE.ui, fontSize: 30, fontWeight: 700, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>
      )}
      {!cover && <div style={{ position: "absolute", left: 78, right: 150, top: 1480, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>}
      {cover && <div style={{ position: "absolute", left: 80, top: 1600, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function calendarValues(input: ReelInput, story: CalendarStory, now: number) {
  const actual = story.bars.map((bar) => bar.value);
  const baseline = story.baseline ?? Math.min(...actual);
  const base = story.bars.map(() => baseline);
  const b1 = spanFor(input, monthBeat(input, "baseline"), "b1");
  const lumpBeats = monthBeats(input, "lumps");
  const b2 = spanFor(input, lumpBeats[0], "b2");
  const b3 = spanFor(input, lumpBeats[1], "b3");
  const b7 = spanFor(input, monthBeat(input, "smoothed"), "b7");
  const firstMonths = lumpBeats[0]?.anchor?.type === "months" ? lumpBeats[0].anchor.months ?? [] : [];
  const secondMonths = lumpBeats[1]?.anchor?.type === "months" ? lumpBeats[1].anchor.months ?? [] : [];

  if (Number.isFinite(b1.endMs) && now < b1.endMs) {
    const p = progress(now, b1.startMs + 100, b1.startMs + 850);
    return actual.map((value) => lerp(value, baseline, p));
  }
  if (Number.isFinite(b2.endMs) && now < b2.endMs) {
    const p = progress(now, b2.startMs + 120, b2.startMs + 900);
    return story.bars.map((bar) => firstMonths.includes(bar.month) ? lerp(baseline, bar.value, p) : baseline);
  }
  if (Number.isFinite(b3.endMs) && now < b3.endMs) {
    const p = progress(now, b3.startMs + 120, b3.startMs + 900);
    return story.bars.map((bar) => {
      if (firstMonths.includes(bar.month)) return bar.value;
      if (secondMonths.includes(bar.month)) return lerp(baseline, bar.value, p);
      return baseline;
    });
  }
  if (now >= b7.startMs && Number.isFinite(b7.startMs) && story.smoothed !== undefined) {
    const p = progress(now, b7.startMs + 80, b7.startMs + 1050);
    return actual.map((value) => lerp(value, story.smoothed ?? value, p));
  }
  return actual;
}

function formulaFor(story: MonthStoryData): MonthFormulaCard {
  if (story.card) return story.card;
  if (isRunway(story)) {
    const runway = story.start / story.monthlyCost;
    return {
      title: "THE RUNWAY CHECK",
      rows: [
        { label: "Easy access cash", value: formatEuro(story.start), tone: "ink" },
        { label: "Real monthly costs", value: `÷ ${formatEuro(story.monthlyCost)}`, tone: "amber" },
        { label: "Runway", value: `${runway.toFixed(1)} months`, tone: "teal" },
      ],
      footnote: story.disclosure,
    };
  }
  const baseline = story.baseline ?? Math.min(...story.bars.map((bar) => bar.value));
  const annual = story.bars.reduce((sum, bar) => sum + Math.max(0, bar.value - baseline), 0);
  const monthly = story.smoothed === undefined ? annual / 12 : story.smoothed - baseline;
  return {
    title: "THE TWELFTH RULE",
    rows: [
      { label: "Once a year costs", value: formatEuro(annual), tone: "ink" },
      { label: "Divide by 12", value: "÷ 12", tone: "amber" },
      { label: "Set aside monthly", value: formatEuro(monthly), tone: "teal" },
    ],
    footnote: story.disclosure,
  };
}

function FormulaCard({ card, opacity = 1, compact = false }: { card: MonthFormulaCard; opacity?: number; compact?: boolean }) {
  if (compact) {
    return (
      <div style={{ width: 790, height: 430, borderRadius: 24, background: BRAND.paper, color: BRAND.ink, boxShadow: "14px 16px 0 rgba(0,0,0,0.18)", overflow: "hidden", opacity }}>
        <div style={{ height: 82, padding: "0 28px", display: "flex", alignItems: "center", background: BRAND.ink, fontFamily: TYPE.ui, fontSize: 20, fontWeight: 820, letterSpacing: "0.16em", color: "#9FE9DD" }}>{card.title}</div>
        <div style={{ padding: "4px 28px" }}>
          {card.rows.slice(0, 3).map((row) => (
            <div key={`${row.label}-${row.value}`} style={{ height: 108, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", borderBottom: `2px solid ${BRAND.hairline}`, color: toneColor(row.tone) }}>
              <div style={{ fontFamily: TYPE.ui, fontSize: 24, fontWeight: 760 }}>{row.label}</div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 43, fontWeight: 840, letterSpacing: "-0.035em", whiteSpace: "nowrap" }}>{row.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: 82, top: 390, width: 886, height: 920, border: `3px solid ${BRAND.ink}`, borderRadius: 28, background: "rgba(255,255,255,0.76)", boxShadow: "12px 14px 0 rgba(0,33,113,0.09)", overflow: "hidden", opacity }}>
      <div style={{ height: 140, padding: "0 36px", display: "flex", alignItems: "center", background: BRAND.ink, color: "#9FE9DD", fontFamily: TYPE.ui, fontSize: 24, fontWeight: 820, letterSpacing: "0.17em" }}>{card.title}</div>
      <div style={{ padding: "10px 36px 0" }}>
        {card.rows.slice(0, 3).map((row) => (
          <div key={`${row.label}-${row.value}`} style={{ height: 218, display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", borderBottom: `2px solid ${BRAND.hairline}`, color: toneColor(row.tone) }}>
            <div style={{ fontFamily: TYPE.ui, fontSize: 31, fontWeight: 780, lineHeight: 1.15 }}>{row.label}</div>
            <div style={{ fontFamily: TYPE.ui, fontSize: 68, fontWeight: 850, lineHeight: 1, letterSpacing: "-0.045em", whiteSpace: "nowrap" }}>{row.value}</div>
          </div>
        ))}
      </div>
      {card.footnote && <div style={{ position: "absolute", left: 36, right: 36, bottom: 27, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{card.footnote}</div>}
    </div>
  );
}

function CalendarVisual({ input, story, now }: { input: ReelInput; story: CalendarStory; now: number }) {
  const b4 = spanFor(input, monthBeat(input, "short"), "b4");
  const b5 = spanFor(input, monthBeat(input, "average"), "b5");
  const b6 = spanFor(input, monthBeat(input, "rule"), "b6");
  const b7 = spanFor(input, monthBeat(input, "smoothed"), "b7");
  const lumpBeats = monthBeats(input, "lumps");
  const active = currentBeat(input, now);
  const activeStage = active?.beat.anchor?.type === "months" ? active.beat.anchor.stage : undefined;
  const annotatedMonths = active?.beat.anchor?.type === "months" && activeStage === "lumps" ? active.beat.anchor.months ?? [] : [];
  const values = calendarValues(input, story, now);
  const chartExit = progress(now, b6.startMs, b6.startMs + 300);
  const cardIn = progress(now, b6.startMs + 310, b6.startMs + 760);
  const cardOut = progress(now, b7.startMs, b7.startMs + 480);
  const chartOpacity = now < b6.startMs ? 1 : now < b7.startMs ? 1 - chartExit : cardOut;
  const cardOpacity = now < b6.startMs ? 0 : now < b7.startMs ? cardIn : 1 - cardOut;
  const mode: CalendarMode = activeStage === "short"
    ? "short"
    : activeStage === "average" || activeStage === "rule"
      ? "average"
      : activeStage === "smoothed"
        ? "smoothed"
        : "normal";
  const annotationOpacity = activeStage === "lumps" ? 1 : 0;
  const genericSeries = activeStage === "series" || activeStage === "highlight";
  const displayValues = genericSeries ? story.bars.map((bar) => bar.value) : values;
  const highlighted = activeStage === "highlight" && active?.beat.anchor?.type === "months" ? active.beat.anchor.months ?? [] : annotatedMonths;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ opacity: chartOpacity }}>
        <MonthHeading input={input} now={now} />
        <CalendarBars story={story} values={displayValues} mode={mode} annotatedMonths={highlighted} annotationOpacity={annotationOpacity} />
        <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>
      </div>
      {now >= b6.startMs && now < b7.startMs + 500 && (
        <div style={{ opacity: cardOpacity }}>
          <MonthHeading input={input} now={now} />
          <FormulaCard card={formulaFor(story)} />
        </div>
      )}
    </div>
  );
}

function RunwayScale({
  slots = 12,
  months,
  tone = "teal",
  markerLabel,
  ghostMonths,
  ghostLabel,
  opacity = 1,
  top = 650,
  height = 580,
}: {
  slots?: number;
  months: number;
  tone?: "teal" | "amber" | "ink";
  markerLabel?: string;
  ghostMonths?: number;
  ghostLabel?: string;
  opacity?: number;
  top?: number;
  height?: number;
}) {
  const width = 936;
  const left = 18;
  const gap = 10;
  const slotWidth = (width - left * 2 - gap * (slots - 1)) / slots;
  const y = 170;
  const slotHeight = 260;
  const color = tone === "amber" ? BRAND.amber : tone === "ink" ? BRAND.ink : BRAND.teal;
  const xAt = (value: number) => left + value * (slotWidth + gap) - gap;
  const labelPosition = (lineX: number, edgeZone = 190) => {
    if (lineX < edgeZone) return { x: lineX + 14, anchor: "start" as const };
    if (lineX > width - edgeZone) return { x: lineX - 14, anchor: "end" as const };
    return { x: lineX, anchor: "middle" as const };
  };
  const markerPosition = labelPosition(xAt(months));
  const ghostPosition = ghostMonths === undefined ? undefined : labelPosition(xAt(ghostMonths));
  return (
    <div style={{ position: "absolute", left: 72, top, width, height, opacity }}>
      <svg viewBox={`0 0 ${width} 580`} width={width} height={height}>
        {Array.from({ length: slots }, (_, index) => {
          const coverage = clamp(months - index);
          const x = left + index * (slotWidth + gap);
          return (
            <g key={index}>
              <rect x={x} y={y} width={slotWidth} height={slotHeight} rx={13} fill="rgba(0,33,113,0.055)" stroke={BRAND.hairline} strokeWidth={2} />
              {coverage > 0 && <rect x={x} y={y} width={slotWidth * coverage} height={slotHeight} rx={coverage >= 0.98 ? 13 : 5} fill={color} />}
              <text x={x + slotWidth / 2} y={y + slotHeight + 42} textAnchor="middle" fontFamily={TYPE.ui} fontSize={25} fontWeight={760} fill={BRAND.inkMuted}>{index + 1}</text>
            </g>
          );
        })}
        <text x={left} y={y + slotHeight + 84} fontFamily={TYPE.ui} fontSize={27} fontWeight={760} fill={BRAND.inkMuted}>MONTHS</text>
        {months > 0 && (
          <g>
            <line x1={xAt(months)} y1={125} x2={xAt(months)} y2={y + slotHeight + 8} stroke={color} strokeWidth={5} />
            {markerLabel && <text x={markerPosition.x} y={101} textAnchor={markerPosition.anchor} fontFamily={TYPE.ui} fontSize={32} fontWeight={850} fill={color}>{markerLabel}</text>}
          </g>
        )}
        {ghostMonths !== undefined && (
          <g>
            <line x1={left} y1={55} x2={xAt(ghostMonths)} y2={55} stroke={BRAND.inkMuted} strokeWidth={4} strokeDasharray="12 10" />
            <line x1={xAt(ghostMonths)} y1={44} x2={xAt(ghostMonths)} y2={y + slotHeight + 8} stroke={BRAND.inkMuted} strokeWidth={4} strokeDasharray="12 10" />
            {ghostLabel && ghostPosition && <text x={ghostPosition.x} y={34} textAnchor={ghostPosition.anchor} fontFamily={TYPE.ui} fontSize={30} fontWeight={820} fill={BRAND.inkMuted}>{ghostLabel}</text>}
          </g>
        )}
      </svg>
    </div>
  );
}

function CashStack({ value, label, tone = "ink", excluded = false, left = 105 }: { value: number; label: string; tone?: "ink" | "muted" | "teal"; excluded?: boolean; left?: number }) {
  const color = tone === "teal" ? BRAND.teal : tone === "muted" ? BRAND.inkSoft : BRAND.ink;
  const outline = tone === "muted" ? "#8491A8" : color;
  const cardWidth = 345;
  const innerPadding = 34;
  const innerWidth = cardWidth - innerPadding * 2;
  return (
    <div style={{ position: "absolute", left, top: 590, width: 390, height: 500 }}>
      {[3, 2, 1, 0].map((index) => (
        <div key={index} style={{ position: "absolute", left: index * 10, top: index * 15, width: cardWidth, height: 245, borderRadius: 24, border: `${excluded ? 4 : 3}px ${excluded ? "dashed" : "solid"} ${outline}`, background: excluded ? "rgba(132,145,168,0.08)" : BRAND.paperWhite, boxShadow: excluded ? "none" : "8px 10px 0 rgba(0,33,113,0.06)" }} />
      ))}
      <div style={{ position: "absolute", left: innerPadding, top: 94, width: innerWidth, fontFamily: TYPE.ui, fontSize: 61, fontWeight: 850, letterSpacing: "-0.05em", color }}>{formatEuro(value)}</div>
      <div style={{ position: "absolute", left: innerPadding, top: 174, width: innerWidth, fontFamily: TYPE.ui, fontSize: 26, lineHeight: 1.12, fontWeight: 700, overflowWrap: "break-word", color }}>{label}</div>
    </div>
  );
}

function RunwayHook({ story, plan, cover = false }: { story: RunwayStory; plan: ReelPlan; cover?: boolean }) {
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  const months = story.start / story.monthlyCost;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 360 : 184 }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: cover ? 61 : 74, fontWeight: 830, lineHeight: 1.04, letterSpacing: "-0.04em", color: BRAND.ink }}>{hook.onscreenLines[0]}</div>
        <div style={{ marginTop: 17, fontFamily: TYPE.ui, fontSize: cover ? 58 : 70, fontWeight: 830, lineHeight: 1.04, letterSpacing: "-0.04em", color: BRAND.teal }}>{hook.onscreenLines[1]}</div>
      </div>
      <RunwayScale slots={story.slots ?? 12} months={months} markerLabel={`${months.toFixed(1)} months`} top={cover ? 690 : 590} height={cover ? 680 : 720} />
      {hook.onscreenLines[2] && <div style={{ position: "absolute", left: 78, top: cover ? 1500 : 1405, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 720, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>}
      {!cover && <div style={{ position: "absolute", left: 78, right: 150, top: 1480, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>}
      {cover && <div style={{ position: "absolute", left: 80, top: 1600, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function RunwayVisual({ input, story, now }: { input: ReelInput; story: RunwayStory; now: number }) {
  const b1 = spanFor(input, monthBeat(input, "cash"), "b1");
  const b2 = spanFor(input, monthBeat(input, "excluded"), "b2");
  const b3 = spanFor(input, monthBeat(input, "cost"), "b3");
  const b4 = spanFor(input, monthBeat(input, "drain"), "b4");
  const b5 = spanFor(input, monthBeat(input, "budget"), "b5");
  const b6 = spanFor(input, monthBeat(input, "alt"), "b6");
  const b7 = spanFor(input, monthBeat(input, "rule"), "b7");
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "months" ? active.beat.anchor.stage : undefined;
  const runway = story.start / story.monthlyCost;
  const budgetRunway = story.budgetCost ? story.start / story.budgetCost : undefined;
  const altRunway = story.altCost ? story.start / story.altCost : undefined;
  const drainLinear = clamp((now - (b4.startMs + 120)) / Math.max(1, b4.endMs - b4.startMs - 620));
  const drainedMonths = Math.min(Math.round(runway), Math.floor(drainLinear * (Math.round(runway) + 1)));
  const cardIn = progress(now, b7.startMs, b7.startMs + 450);

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <MonthHeading input={input} now={now} />

      {stage === "cash" && <CashStack value={story.start} label={story.cashLabel ?? "Easy access savings"} tone="teal" left={335} />}

      {stage === "excluded" && (
        <>
          <CashStack value={story.start} label={story.cashLabel ?? "Easy access savings"} tone="teal" left={92} />
          {story.excluded && <CashStack value={story.excluded.value} label={story.excluded.label} tone="muted" excluded left={585} />}
        </>
      )}

      {stage === "cost" && (
        <>
          <div style={{ position: "absolute", left: 76, top: 535, fontFamily: TYPE.ui, fontSize: 92, fontWeight: 850, letterSpacing: "-0.055em", color: BRAND.amber }}>{formatEuro(story.monthlyCost)}</div>
          <RunwayScale slots={story.slots ?? 12} months={1} tone="amber" markerLabel="One month" top={670} height={570} />
        </>
      )}

      {stage === "drain" && (
        <>
          <div style={{ position: "absolute", left: 76, top: 515, fontFamily: TYPE.ui, fontSize: 28, fontWeight: 760, color: BRAND.inkMuted }}>CASH LEFT</div>
          <div style={{ position: "absolute", left: 76, top: 555, fontFamily: TYPE.ui, fontSize: 88, fontWeight: 850, letterSpacing: "-0.055em", color: BRAND.teal }}>{formatEuro(Math.max(0, story.start - story.monthlyCost * drainedMonths))}</div>
          <RunwayScale slots={story.slots ?? 12} months={drainedMonths} markerLabel={drainedMonths >= Math.round(runway) ? `${runway.toFixed(1)} months` : undefined} top={710} height={560} />
        </>
      )}

      {stage === "budget" && <RunwayScale slots={story.slots ?? 12} months={runway} markerLabel={`${runway.toFixed(1)} real`} ghostMonths={budgetRunway} ghostLabel={budgetRunway === undefined ? undefined : `${budgetRunway.toFixed(1)} budget`} top={620} height={650} />}

      {(stage === "alt" || stage === "rule") && altRunway !== undefined && (
        <RunwayScale slots={story.slots ?? 12} months={altRunway} tone="amber" markerLabel={`${altRunway.toFixed(1)} months`} ghostMonths={runway} ghostLabel={`${runway.toFixed(1)} before`} top={620} height={650} opacity={stage === "rule" ? 1 - cardIn : 1} />
      )}

      {now >= b7.startMs && (
        <div style={{ position: "absolute", inset: 0, background: BRAND.paper, opacity: cardIn }}>
          <MonthHeading input={input} now={now} />
          <FormulaCard card={formulaFor(story)} />
        </div>
      )}

      {stage !== "rule" && <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>}
    </div>
  );
}

export function MonthStory({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = (frame / fps) * 1000;
  const story = input.plan.monthStory;
  if (!story) return null;
  if (now < input.hookSpan.endMs) {
    return isRunway(story)
      ? <RunwayHook story={story} plan={input.plan} />
      : <CalendarHook story={story} plan={input.plan} />;
  }
  return isRunway(story)
    ? <RunwayVisual input={input} story={story} now={now} />
    : <CalendarVisual input={input} story={story} now={now} />;
}

export function MonthStoryCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const story = input.plan.monthStory;
  if (!story) return null;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: 275, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}>
        <FormulaCard card={formulaFor(story)} compact />
      </div>
      <div style={{ position: "absolute", left: 130, right: 150, top: 730, textAlign: "center", fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{story.disclosure}</div>
      <div style={{ position: "absolute", left: 70, right: 100, top: 790, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 112, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 49, fontWeight: 760, lineHeight: 1.12, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
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

export function MonthStoryCover({ plan }: { plan: ReelPlan }) {
  const story = plan.monthStory;
  if (!story) return null;
  return isRunway(story)
    ? <RunwayHook story={story} plan={plan} cover />
    : <CalendarHook story={story} plan={plan} cover />;
}
