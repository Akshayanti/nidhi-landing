import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type Beat,
  type BeatSpan,
  type ColumnGroup,
  type ColumnStage,
  type ReelInput,
  type ReelPlan,
  type ToolCardData,
} from "../data";
import { ToolCard } from "./ToolCard";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const progress = (now: number, start: number, end: number) => ease((now - start) / Math.max(1, end - start));
const lerp = (from: number, to: number, amount: number) => from + (to - from) * amount;

function toneColor(tone: ColumnGroup["tone"]) {
  if (tone === "amber") return BRAND.amber;
  if (tone === "muted") return "#7D899F";
  if (tone === "ink") return BRAND.ink;
  return BRAND.teal;
}

function findBeat(input: ReelInput, predicate: (beat: Beat) => boolean) {
  return input.plan.beats.find(predicate);
}

function columnBeat(input: ReelInput, stage: ColumnStage) {
  return findBeat(input, (beat) => beat.anchor?.type === "columns" && beat.anchor.stage === stage);
}

function cardBeat(input: ReelInput) {
  return findBeat(input, (beat) => beat.anchor?.type === "card");
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

function ColumnHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  if (!active || !["columns", "card"].includes(active.beat.anchor?.type ?? "")) return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 105, zIndex: 8, opacity, transform: `translateY(${(1 - opacity) * 10}px)` }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 60, fontWeight: 820, lineHeight: 1.04, letterSpacing: "-0.035em", color: BRAND.ink }}>{active.beat.onscreenText}</div>
      {active.beat.subtext && <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 630, lineHeight: 1.2, color: BRAND.inkSoft }}>{active.beat.subtext}</div>}
    </div>
  );
}

function ColumnPanel({
  group,
  left,
  top,
  width,
  height,
  reveal = 1,
  ruleReveal = 1,
  items,
  compact = false,
  hero = false,
}: {
  group: ColumnGroup;
  left: number;
  top: number;
  width: number;
  height: number;
  reveal?: number;
  ruleReveal?: number;
  items?: string[];
  compact?: boolean;
  hero?: boolean;
}) {
  const color = toneColor(group.tone);
  const shownItems = items ?? group.items;
  const headerHeight = hero ? 190 : compact ? 174 : 205;
  return (
    <div style={{ position: "absolute", left, top, width, height, border: `3px solid ${color}`, borderRadius: 28, background: "rgba(255,255,255,0.66)", overflow: "hidden", boxShadow: "10px 12px 0 rgba(0,33,113,0.06)" }}>
      <div style={{ height: hero ? headerHeight : undefined, minHeight: hero ? undefined : headerHeight, padding: hero ? "28px 28px" : compact ? "27px 27px" : "33px 34px", background: color, color: group.tone === "amber" ? BRAND.paper : "#fff" }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: hero ? 37 : compact ? 34 : 40, fontWeight: 820, lineHeight: 1.06, letterSpacing: "-0.025em" }}>{group.title}</div>
        <div style={{ marginTop: 17, display: "inline-block", padding: hero ? "10px 16px" : compact ? "9px 15px" : "11px 18px", borderRadius: 999, background: BRAND.paper, color, fontFamily: TYPE.ui, fontSize: hero ? 28 : compact ? 26 : 31, fontWeight: 850, letterSpacing: "0.07em", textTransform: "uppercase", opacity: 0.22 + 0.78 * ruleReveal }}>{group.rule}</div>
      </div>
      <div style={{ height: hero ? height - headerHeight : undefined, padding: hero ? "8px 25px 12px" : compact ? "14px 24px" : "18px 30px", display: hero ? "flex" : undefined, flexDirection: hero ? "column" : undefined }}>
        {shownItems.map((item, index) => {
          const itemReveal = progress(reveal, index * 0.12, 0.5 + index * 0.12);
          return (
            <div key={`${group.id}-${item}`} style={{ minHeight: hero ? 0 : compact ? 124 : 128, flex: hero ? 1 : undefined, display: "flex", alignItems: "center", gap: hero ? 17 : compact ? 16 : 19, borderBottom: `2px solid ${BRAND.hairline}`, opacity: itemReveal, transform: `translateY(${(1 - itemReveal) * 10}px)` }}>
              <div style={{ width: hero ? 15 : compact ? 14 : 16, height: hero ? 15 : compact ? 14 : 16, flex: "none", borderRadius: "50%", background: color }} />
              <div style={{ fontFamily: TYPE.ui, fontSize: hero ? 37 : compact ? 33 : 38, lineHeight: 1.08, fontWeight: 750, color: BRAND.ink }}>{item}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ColumnHook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const story = plan.columnStory;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  const top = cover ? 535 : 405;
  const height = cover ? 910 : 1010;
  const width = 462;
  const gap = 20;
  const left = 68;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 820, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 350 : 174, fontFamily: TYPE.ui, fontSize: cover ? 69 : 78, lineHeight: 1.01, fontWeight: 840, letterSpacing: "-0.045em", color: BRAND.ink }}>
        <div>{hook.onscreenLines[0]}</div>
        <div style={{ color: BRAND.amber }}>{hook.onscreenLines[1]}</div>
      </div>
      <ColumnPanel group={story.left} left={left} top={top} width={width} height={height} compact hero reveal={1} />
      <ColumnPanel group={story.right} left={left + width + gap} top={top} width={width} height={height} compact hero reveal={1} />
      {hook.onscreenLines[2] && <div style={{ position: "absolute", left: 78, top: cover ? 1480 : 1450, fontFamily: TYPE.ui, fontSize: cover ? 33 : 37, fontWeight: 770, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>}
      <div style={{ position: "absolute", left: 78, right: 130, top: cover ? 1545 : 1515, fontFamily: TYPE.ui, fontSize: cover ? 21 : 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{story.disclosure}</div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1640, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function SingleColumn({ input, now, group, stage, ruleStage }: { input: ReelInput; now: number; group: ColumnGroup; stage: ColumnStage; ruleStage: ColumnStage }) {
  const listSpan = spanFor(input, columnBeat(input, stage), stage === "left" ? "b1" : "b3");
  const ruleSpan = spanFor(input, columnBeat(input, ruleStage), ruleStage === "left-rule" ? "b2" : "b4");
  const inRule = now >= ruleSpan.startMs;
  const reveal = inRule ? 1 : progress(now, listSpan.startMs + 100, listSpan.startMs + 1100);
  const ruleReveal = inRule ? progress(now, ruleSpan.startMs + 100, ruleSpan.startMs + 700) : 0;
  return (
    <>
      <ColumnPanel group={group} left={112} top={475} width={856} height={850} reveal={reveal} ruleReveal={ruleReveal} />
      {inRule && (
        <div style={{ position: "absolute", left: 160, right: 160, top: 1350, padding: "23px 28px", borderRadius: 18, background: toneColor(group.tone), color: BRAND.paper, textAlign: "center", fontFamily: TYPE.ui, fontSize: 34, lineHeight: 1.15, fontWeight: 770, opacity: ruleReveal }}>
          {currentBeat(input, now)?.beat.subtext}
        </div>
      )}
    </>
  );
}

function Buffers({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.columnStory;
  if (!story) return null;
  const span = spanFor(input, columnBeat(input, "buffers"), "b5");
  return (
    <>
      <div style={{ position: "absolute", left: 112, right: 112, top: 500, height: 140, padding: "26px 32px", borderRadius: 24, display: "flex", alignItems: "center", justifyContent: "space-between", background: BRAND.amber, color: BRAND.paper }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 37, fontWeight: 820 }}>{story.right.title}</div>
        <div style={{ padding: "10px 18px", borderRadius: 999, background: BRAND.paper, color: BRAND.amber, fontFamily: TYPE.ui, fontSize: 27, fontWeight: 850, textTransform: "uppercase", letterSpacing: "0.08em" }}>{story.right.rule}</div>
      </div>
      <div style={{ position: "absolute", left: 112, right: 112, top: 685, display: "flex", flexDirection: "column", gap: 24 }}>
        {(story.buffers ?? []).slice(0, 3).map((item, index) => {
          const enter = progress(now, span.startMs + 200 + index * 420, span.startMs + 780 + index * 420);
          return (
            <div key={item} style={{ minHeight: 186, padding: "30px 32px", display: "grid", gridTemplateColumns: "76px 1fr", alignItems: "center", gap: 24, border: `3px solid ${BRAND.amber}`, borderRadius: 24, background: "rgba(255,255,255,0.68)", opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}>
              <div style={{ width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(201,121,26,0.12)", color: BRAND.amber, fontFamily: TYPE.ui, fontSize: 29, fontWeight: 850 }}>{index + 1}</div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 38, lineHeight: 1.12, fontWeight: 750, color: BRAND.ink }}>{item}</div>
            </div>
          );
        })}
      </div>
    </>
  );
}

function SwapVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.columnStory;
  if (!story) return null;
  const span = spanFor(input, columnBeat(input, "swap"), "b6");
  const duration = Math.max(1, span.endMs - span.startMs);
  // Hold the item in the wrong column long enough for the error to register,
  // then make one decisive move to its correct home.
  const move = progress(now, span.startMs + duration * 0.55, span.startMs + duration * 0.76);
  const swap = story.swap ?? {
    item: story.left.items[0] ?? "Planned event",
    belongs: "left" as const,
    wrongLabel: "wrong column",
    correctLabel: "right column",
  };
  const startsRight = swap.belongs === "left";
  const left = lerp(startsRight ? 612 : 154, startsRight ? 154 : 612, move);
  const top = 1210;
  const leftItems = swap.belongs === "left" ? story.left.items.filter((item) => item !== swap.item) : story.left.items;
  const rightItems = swap.belongs === "right" ? story.right.items.filter((item) => item !== swap.item) : story.right.items;
  const wrongTone = startsRight ? story.right.tone : story.left.tone;
  const rightTone = swap.belongs === "left" ? story.left.tone : story.right.tone;
  return (
    <>
      <ColumnPanel group={story.left} left={72} top={500} width={454} height={850} compact items={leftItems} />
      <ColumnPanel group={story.right} left={554} top={500} width={454} height={850} compact items={rightItems} />
      <div style={{ position: "absolute", left, top, width: 360, minHeight: 126, padding: "21px 24px", borderRadius: 18, background: BRAND.paper, border: `4px solid ${toneColor(move > 0.55 ? rightTone : wrongTone)}`, boxShadow: "8px 9px 0 rgba(0,33,113,0.09)", zIndex: 6 }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 34, fontWeight: 830, color: BRAND.ink }}>{swap.item}</div>
        <div style={{ marginTop: 8, fontFamily: TYPE.ui, fontSize: 25, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: toneColor(move > 0.55 ? rightTone : wrongTone) }}>{move > 0.55 ? (swap.correctLabel ?? "right column") : (swap.wrongLabel ?? "wrong column")}</div>
      </div>
    </>
  );
}

function ColumnVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.columnStory;
  if (!story) return null;
  if (now < input.hookSpan.endMs) return <ColumnHook plan={input.plan} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "columns" ? active.beat.anchor.stage : undefined;
  const toolBeat = cardBeat(input);
  const toolSpan = spanFor(input, toolBeat, "b7");
  const tool = toolBeat?.anchor?.type === "card" ? toolBeat.anchor : undefined;

  if (now >= toolSpan.startMs && tool) {
    const enter = progress(now, toolSpan.startMs, toolSpan.startMs + 450);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <ColumnHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}><ToolCard card={tool as ToolCardData} /></div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <ColumnHeading input={input} now={now} />
      {(stage === "left" || stage === "left-rule") && <SingleColumn input={input} now={now} group={story.left} stage="left" ruleStage="left-rule" />}
      {(stage === "right" || stage === "right-rule") && <SingleColumn input={input} now={now} group={story.right} stage="right" ruleStage="right-rule" />}
      {stage === "buffers" && <Buffers input={input} now={now} />}
      {stage === "swap" && <SwapVisual input={input} now={now} />}
      <div style={{ position: "absolute", left: 76, right: 150, top: 1465, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{story.disclosure}</div>
    </div>
  );
}

export function ColumnStory({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <ColumnVisual input={input} now={(frame / fps) * 1000} />;
}

export function ColumnStoryCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const beat = cardBeat(input);
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  const story = input.plan.columnStory;
  if (!card || !story) return null;
  // A compact ToolCard is 410px tall for one or two rows, 560 for three or
  // four and 620 for five. Taller cards start higher (180, clear of the series
  // chip, as DirectBarCTA does), and the disclosure and
  // heading follow the card instead of sitting at fixed positions under it.
  const rows = Math.min(card.rows.length, 5);
  const tall = rows > 2;
  const cardTop = tall ? 180 : 280;
  const cardHeight = rows > 4 ? 620 : rows > 2 ? 560 : 410;
  const disclosureTop = tall ? cardTop + cardHeight + 18 : 720;
  const headingTop = tall ? cardTop + cardHeight + 100 : 785;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: cardTop, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}><ToolCard card={card} compact /></div>
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

export function ColumnStoryCover({ plan }: { plan: ReelPlan }) {
  return <ColumnHook plan={plan} cover />;
}
