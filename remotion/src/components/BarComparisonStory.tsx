import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type BarDatum,
  type BarStage,
  type Beat,
  type BeatSpan,
  type MultiplierRow,
  type MultiplierStage,
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
const unitProgress = (value: number, start: number, end: number) => ease((value - start) / Math.max(0.0001, end - start));

function findBeat(input: ReelInput, predicate: (beat: Beat) => boolean) {
  return input.plan.beats.find(predicate);
}

function barBeat(input: ReelInput, stage: BarStage) {
  return findBeat(input, (beat) => beat.anchor?.type === "bars" && beat.anchor.stage === stage);
}

function multiplierBeat(input: ReelInput, stage: MultiplierStage) {
  return findBeat(input, (beat) => beat.anchor?.type === "multiplier" && beat.anchor.stage === stage);
}

function toolCardBeat(input: ReelInput) {
  return findBeat(input, (beat) => beat.anchor?.type === "card");
}

function spanFor(input: ReelInput, beat: Beat | undefined, fallbackId: string): BeatSpan {
  return input.beatSpans.find((span) => span.beatId === beat?.id)
    ?? input.beatSpans.find((span) => span.beatId === fallbackId)
    ?? { beatId: fallbackId, startMs: Number.POSITIVE_INFINITY, endMs: Number.POSITIVE_INFINITY };
}

function barColor(bar: BarDatum) {
  if (bar.tone === "amber") return BRAND.amber;
  if (bar.tone === "teal") return BRAND.teal;
  if (bar.tone === "muted") return "#8491A8";
  return BRAND.ink;
}

function barTextColor(bar: BarDatum) {
  return bar.tone === "muted" ? BRAND.inkSoft : barColor(bar);
}

function rowColor(row: MultiplierRow) {
  if (row.tone === "amber") return BRAND.amber;
  if (row.tone === "teal") return BRAND.teal;
  return BRAND.ink;
}

function factor(value: number) {
  return value.toLocaleString("en-GB");
}

function repeatFor(bar: BarDatum, input?: ReelInput) {
  if (bar.repeat) return bar.repeat;
  const monthly = /month/i.test(bar.sublabel ?? "");
  if (monthly) {
    const count = (input?.plan.assumptions?.horizonYears ?? 30) * 12;
    return { count, label: `${count} monthly payments` };
  }
  return { count: 1, label: "one event" };
}

function currentBeat(input: ReelInput, now: number) {
  const span = input.beatSpans.find((item) => now >= item.startMs && now < item.endMs);
  const beat = span ? input.plan.beats.find((item) => item.id === span.beatId) : undefined;
  return beat && span ? { beat, span } : undefined;
}

function StoryHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  if (!active || !["bars", "multiplier", "card"].includes(active.beat.anchor?.type ?? "")) return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 110, opacity, transform: `translateY(${(1 - opacity) * 10}px)`, zIndex: 4 }}>
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

function ResolvedBars({
  bars,
  reveal,
  opacity = 1,
  top = 530,
  scaleMax,
  stagger = true,
  labelsReveal,
  minBarWidth = 118,
}: {
  bars: BarDatum[];
  reveal: number;
  opacity?: number;
  top?: number;
  scaleMax?: number;
  stagger?: boolean;
  labelsReveal?: number;
  minBarWidth?: number;
}) {
  const shown = bars.slice(0, 4);
  const max = scaleMax ?? Math.max(1, ...shown.map((bar) => bar.value));
  const count = shown.length;
  const stride = count === 2 ? 510 : count === 3 ? 330 : count >= 4 ? 240 : 0;
  const height = count >= 4 ? 68 : count === 3 ? 82 : 106;

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {shown.map((bar, index) => {
        const rowReveal = stagger
          ? unitProgress(reveal, index * 0.12, 0.58 + index * 0.12)
          : reveal;
        const labelOpacity = labelsReveal ?? rowReveal;
        const width = Math.max(minBarWidth, (bar.value / max) * 690) * rowReveal;
        const y = top + index * stride;
        return (
          <div key={bar.id} style={{ position: "absolute", left: 88, right: 84, top: y }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 15, opacity: labelOpacity }}>
              <span style={{ fontFamily: TYPE.ui, fontSize: count >= 4 ? 27 : 32, fontWeight: 780, color: BRAND.ink }}>{bar.label}</span>
              {bar.sublabel && <span style={{ fontFamily: TYPE.ui, fontSize: count >= 4 ? 22 : 26, fontWeight: 650, color: BRAND.inkMuted }}>{bar.sublabel}</span>}
            </div>
            <div style={{ position: "relative", height, opacity: rowReveal }}>
              <div style={{ position: "absolute", inset: 0, width: 690, borderRadius: 18, background: "rgba(0,33,113,0.055)" }} />
              <div style={{ position: "absolute", left: 0, top: 0, height, width, borderRadius: 18, background: barColor(bar), transformOrigin: "left center" }} />
              <div style={{ position: "absolute", left: Math.min(width + 20, 720), top: "50%", transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: count >= 4 ? 37 : 48, fontWeight: 820, lineHeight: 1, letterSpacing: "-0.035em", color: barTextColor(bar), whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", opacity: labelOpacity }}>
                {bar.display}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RepeatField({ bar, input, fill, collapse }: { bar: BarDatum; input: ReelInput; fill: number; collapse: number }) {
  const repeat = repeatFor(bar, input);
  const visibleCount = Math.min(360, Math.max(1, repeat.count));
  const columns = repeat.count === 360 ? 30 : Math.min(30, Math.max(1, Math.ceil(Math.sqrt(visibleCount * 2.5))));
  const filled = Math.round(fill * visibleCount);
  const labelExit = unitProgress(collapse, 0, 0.25);
  const gridExit = unitProgress(collapse, 0.82, 1);
  const scaleX = 1 - collapse * 0.223;
  const scaleY = 1 - collapse * 0.588;
  return (
    <div style={{ position: "absolute", left: 92, right: 100, top: 690 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 22, opacity: 1 - labelExit, transform: `translateY(${labelExit * 12}px)` }}>
        <div>
          <div style={{ fontFamily: TYPE.ui, fontSize: 36, fontWeight: 800, color: BRAND.ink }}>{bar.label}</div>
          <div style={{ marginTop: 6, fontFamily: TYPE.ui, fontSize: 27, fontWeight: 650, color: BRAND.amber }}>{bar.sublabel}</div>
        </div>
        <div style={{ fontFamily: TYPE.ui, fontSize: 29, fontWeight: 750, color: BRAND.amber }}>{repeat.label}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 7, padding: 18, border: `2px solid ${BRAND.hairline}`, borderRadius: 18, background: "rgba(255,255,255,0.48)", opacity: 1 - gridExit, transformOrigin: "left top", transform: `translate(${-4 * collapse}px, ${310 * collapse}px) scale(${scaleX}, ${scaleY})` }}>
        {Array.from({ length: visibleCount }, (_, index) => (
          <div key={index} style={{ height: 12, borderRadius: 6, background: index < filled ? BRAND.amber : "rgba(194,65,12,0.10)", opacity: index < filled ? 0.92 : 1 }} />
        ))}
      </div>
      {repeat.count > visibleCount && (
        <div style={{ marginTop: 10, fontFamily: TYPE.ui, fontSize: 22, color: BRAND.inkMuted, opacity: 1 - labelExit }}>Marks show the repeating pattern</div>
      )}
    </div>
  );
}

function ComparisonCallout({ input, amount, opacity }: { input: ReelInput; amount: string; opacity: number }) {
  const story = input.plan.barStory;
  const callout = story?.callout ?? story?.ratio;
  if (!story || !callout) return null;
  const hasLabel = Boolean(callout.label);
  const isPhrase = /\s/.test(amount.trim());
  return (
    <div style={{ position: "absolute", left: hasLabel ? 310 : isPhrase ? 330 : 370, top: hasLabel ? 825 : 850, width: hasLabel ? 420 : isPhrase ? 360 : 300, padding: hasLabel ? "22px 28px" : "25px 28px", borderRadius: 22, background: BRAND.paper, border: `3px solid ${BRAND.amber}`, boxShadow: "9px 10px 0 rgba(194,65,12,0.10)", opacity, textAlign: "center" }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: isPhrase ? 76 : 102, fontWeight: 850, lineHeight: 0.92, color: BRAND.amber, letterSpacing: "-0.06em", whiteSpace: "nowrap" }}>{amount}</div>
      {callout.label && (
        <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.2, fontWeight: 650, color: BRAND.inkSoft }}>{callout.label}</div>
      )}
    </div>
  );
}

function BarHook({ input }: { input: ReelInput }) {
  const story = input.plan.barStory;
  if (!story) return null;
  const hook = input.plan.hookVariants[input.plan.useHookVariant];
  const bars = story.bars.slice(0, 4);
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  // With three or four items, use one shared hook headline and compact rows.
  // The two-item form below stays more dramatic by placing a claim above
  // each bar, which is the right treatment for a direct A versus B contrast.
  if (bars.length > 2) {
    const stride = bars.length === 4 ? 225 : 285;
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", top: 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
        <div style={{ position: "absolute", left: 76, right: 100, top: 188, fontFamily: TYPE.ui, fontSize: 54, lineHeight: 1.04, fontWeight: 830, letterSpacing: "-0.04em", color: BRAND.ink }}>
          {hook.onscreenLines.map((line) => <div key={line}>{line}</div>)}
        </div>
        {bars.map((bar, index) => {
          const y = 520 + index * stride;
          const width = Math.max(96, (bar.value / max) * 690);
          return (
            <div key={bar.id} style={{ position: "absolute", left: 76, right: 90, top: y }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 12 }}>
                <span style={{ fontFamily: TYPE.ui, fontSize: 29, fontWeight: 790, color: BRAND.ink }}>{bar.label}</span>
                {bar.sublabel && <span style={{ fontFamily: TYPE.ui, fontSize: 23, fontWeight: 640, color: BRAND.inkMuted }}>{bar.sublabel}</span>}
              </div>
              <div style={{ position: "relative", height: 76 }}>
                <div style={{ position: "absolute", inset: 0, width: 690, borderRadius: 14, background: "rgba(0,33,113,0.055)" }} />
                <div style={{ position: "absolute", left: 0, top: 0, height: 76, width, borderRadius: 14, background: barColor(bar) }} />
                <div style={{ position: "absolute", left: Math.min(width + 16, 716), top: 38, transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: 38, fontWeight: 830, color: barTextColor(bar), whiteSpace: "nowrap" }}>{bar.display}</div>
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 78, right: 150, top: 1480, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.basis}</div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      {bars.map((bar, index) => {
        const y = index === 0 ? 420 : 980;
        const width = Math.max(story.proportional ? 76 : 150, (bar.value / max) * 760);
        const valueInside = width >= 520;
        return (
          <div key={bar.id} style={{ position: "absolute", left: 76, right: 90, top: y }}>
            <div style={{ fontFamily: TYPE.ui, fontSize: 54, lineHeight: 1.05, fontWeight: 820, letterSpacing: "-0.035em", color: index === 0 ? BRAND.ink : BRAND.amber }}>{hook.onscreenLines[index]}</div>
            <div style={{ marginTop: 15, display: "flex", alignItems: "baseline", gap: 12 }}>
              <span style={{ fontFamily: TYPE.ui, fontSize: 32, fontWeight: 760, color: BRAND.ink }}>{bar.label}</span>
              <span style={{ fontFamily: TYPE.ui, fontSize: 27, fontWeight: 650, color: BRAND.inkMuted }}>{bar.sublabel}</span>
            </div>
            <div style={{ position: "relative", height: 140, marginTop: 24 }}>
              <div style={{ position: "absolute", left: 0, top: 0, height: 140, width: 760, borderRadius: 22, background: "rgba(0,33,113,0.055)" }} />
              <div style={{ position: "absolute", left: 0, top: 0, height: 140, width, borderRadius: 22, background: barColor(bar) }} />
              <div style={valueInside
                ? { position: "absolute", left: 24, top: 70, width: Math.max(0, width - 48), transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: 54, fontWeight: 830, color: BRAND.paper, whiteSpace: "nowrap", textAlign: "right" }
                : { position: "absolute", left: width + 22, top: 70, transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: 54, fontWeight: 830, color: barTextColor(bar), whiteSpace: "nowrap" }}>
                {bar.display}
              </div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 78, top: 1420, fontFamily: TYPE.ui, fontSize: 30, fontWeight: 680, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>
      <div style={{ position: "absolute", left: 78, right: 150, top: 1492, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.basis}</div>
    </div>
  );
}

function BarVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.barStory;
  if (!story) return null;
  const callout = story.callout ?? story.ratio;
  if (now < input.hookSpan.endMs) return <BarHook input={input} />;

  const b1 = spanFor(input, barBeat(input, "first"), "b1");
  const b2 = spanFor(input, barBeat(input, "repeat"), "b2");
  const b3 = spanFor(input, barBeat(input, "second"), "b3");
  const b4 = spanFor(input, barBeat(input, "callout") ?? barBeat(input, "ratio"), "b4");
  const b5 = spanFor(input, barBeat(input, "principle"), "b5");
  const b6 = spanFor(input, multiplierBeat(input, "blank"), "b6");
  const b8 = spanFor(input, barBeat(input, "close"), "b8");
  const first = progress(now, b1.startMs + 150, b1.startMs + 1050);
  const repeating = story.bars.find((bar) => (bar.repeat?.count ?? 0) > 1) ?? story.bars[1] ?? story.bars[0];
  const repeatFill = progress(now, b2.startMs + 150, b2.endMs - 350);
  const repeatCollapse = progress(now, b3.startMs, b3.startMs + 800);
  const resolve = progress(now, b3.startMs + 150, b3.startMs + 900);
  const resolvedLabels = progress(now, b3.startMs + 840, b3.startMs + 1160);
  const hasRatioBeat = Number.isFinite(b4.startMs);
  const ratioStart = hasRatioBeat ? b4.startMs + 200 : b3.startMs + 1400;
  const ratioEnd = hasRatioBeat ? b5.startMs : b3.endMs;
  const ratio = progress(now, ratioStart, ratioStart + 650);
  const principle = progress(now, b5.startMs + 150, b5.startMs + 900);
  const cardIn = progress(now, b6.startMs, b6.startMs + 420);
  const returnBars = progress(now, b8.startMs, b8.startMs + 420);
  const beforeCard = now < b6.startMs;
  const afterCard = now >= b8.startMs;
  const opacity = beforeCard ? 1 : afterCard ? returnBars : 1 - cardIn;
  const allReveal = now < b3.startMs ? 0 : resolve;
  const showRepeat = now >= b2.startMs && now < b3.startMs + 840;
  const showResolved = now >= b3.startMs + 150 || afterCard;
  const reveal = afterCard ? 1 : allReveal;

  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      <StoryHeading input={input} now={now} />
      {now < b2.startMs && (
        <ResolvedBars
          bars={story.bars.slice(0, 1)}
          reveal={first}
          top={620}
          scaleMax={Math.max(1, ...story.bars.map((bar) => bar.value))}
          minBarWidth={story.proportional ? 69 : undefined}
        />
      )}
      {showRepeat && (
        <>
          <div style={{ position: "absolute", left: 92, top: 505, display: "flex", alignItems: "center", gap: 20, opacity: 1 - unitProgress(repeatCollapse, 0, 0.25), transform: `translateY(${unitProgress(repeatCollapse, 0, 0.25) * 12}px)` }}>
            <div style={{ width: 88, height: 88, borderRadius: 16, background: barColor(story.bars[0]) }} />
            <div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 31, fontWeight: 800, color: BRAND.ink }}>{story.bars[0].label}</div>
              <div style={{ marginTop: 5, fontFamily: TYPE.ui, fontSize: 25, fontWeight: 650, color: BRAND.inkMuted }}>{repeatFor(story.bars[0], input).label}</div>
            </div>
          </div>
          <RepeatField bar={repeating} input={input} fill={repeatFill} collapse={repeatCollapse} />
        </>
      )}
      {showResolved && <ResolvedBars bars={story.bars} reveal={reveal} top={540} stagger={false} labelsReveal={afterCard ? 1 : resolvedLabels} minBarWidth={story.proportional ? 69 : undefined} />}
      {now >= ratioStart && now < ratioEnd && <ComparisonCallout input={input} amount={callout?.display ?? ""} opacity={ratio} />}
      {now >= b5.startMs && now < b6.startMs && (
        <div style={{ position: "absolute", left: 94, right: 120, top: 1335, display: "flex", justifyContent: "space-between", opacity: principle }}>
          {story.bars.slice(0, 2).map((bar) => (
            <div key={bar.id} style={{ display: "flex", alignItems: "center", gap: 12, fontFamily: TYPE.ui, fontSize: 25, fontWeight: 720, color: barTextColor(bar) }}>
              <span style={{ width: 18, height: 18, borderRadius: 9, background: barColor(bar) }} />{repeatFor(bar, input).label}
            </div>
          ))}
        </div>
      )}
      <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>
    </div>
  );
}

function DirectBarVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.barStory;
  if (!story) return null;
  if (now < input.hookSpan.endMs) return <BarHook input={input} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "bars" ? active.beat.anchor.stage : undefined;
  const enter = active ? progress(now, active.span.startMs + 100, active.span.startMs + 750) : 1;
  const toolBeat = toolCardBeat(input);
  const toolSpan = spanFor(input, toolBeat, "b6");
  const tool = toolBeat?.anchor?.type === "card" ? toolBeat.anchor : undefined;

  if (now >= toolSpan.startMs && now < toolSpan.endMs && tool) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <StoryHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }} data-reel-reveal>
          <ToolCard card={tool as ToolCardData} />
        </div>
      </div>
    );
  }

  const bars = stage === "first" ? story.bars.slice(0, 1) : story.bars;
  const showBars = stage && !["blank", "hook"].includes(stage);
  const showRatio = stage === "ratio";
  const callout = story.callout ?? story.ratio;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <StoryHeading input={input} now={now} />
      {stage === "blank" && story.setup && (
        <div style={{ position: "absolute", left: 148, top: 610, width: 784, padding: "46px 48px", boxSizing: "border-box", border: `3px solid ${barColor({ ...story.bars[0], tone: story.setup.tone ?? "ink" })}`, borderRadius: 28, background: BRAND.paper, boxShadow: "12px 14px 0 rgba(0,33,113,0.08)", opacity: enter, textAlign: "center" }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 30, fontWeight: 790, color: BRAND.inkSoft }}>{story.setup.label}</div>
          <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 84, lineHeight: 1, fontWeight: 870, letterSpacing: "-0.05em", color: BRAND.ink }}>{story.setup.display}</div>
          {story.setup.note && <div style={{ marginTop: 18, fontFamily: TYPE.ui, fontSize: 29, fontWeight: 650, color: BRAND.inkMuted }}>{story.setup.note}</div>}
        </div>
      )}
      {showBars && <ResolvedBars bars={bars} reveal={enter} top={stage === "first" ? 650 : 540} stagger={false} labelsReveal={enter} scaleMax={Math.max(1, ...story.bars.map((bar) => bar.value))} minBarWidth={story.proportional ? 69 : undefined} />}
      {showRatio && callout && <ComparisonCallout input={input} amount={callout.display} opacity={enter} />}
      <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>
    </div>
  );
}

function SumBarVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.barStory;
  if (!story) return null;
  if (now < input.hookSpan.endMs) return <BarHook input={input} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "bars" ? active.beat.anchor.stage : undefined;
  const enter = active ? progress(now, active.span.startMs + 100, active.span.startMs + 750) : 1;
  const toolBeat = toolCardBeat(input);
  const toolSpan = spanFor(input, toolBeat, "b6");
  const tool = toolBeat?.anchor?.type === "card" ? toolBeat.anchor : undefined;
  if (now >= toolSpan.startMs && now < toolSpan.endMs && tool) {
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <StoryHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }} data-reel-reveal><ToolCard card={tool as ToolCardData} /></div>
      </div>
    );
  }
  const count = stage === "first" ? 1 : stage === "second" ? 2 : 3;
  const showBars = stage && ["first", "second", "third", "callout", "close"].includes(stage);
  const total = story.bars.reduce((sum, bar) => sum + bar.value, 0);
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <StoryHeading input={input} now={now} />
      {showBars && <ResolvedBars bars={story.bars.slice(0, count)} reveal={enter} top={count === 1 ? 650 : count === 2 ? 560 : 480} stagger={false} labelsReveal={enter} scaleMax={Math.max(1, ...story.bars.map((bar) => bar.value))} />}
      {stage === "callout" && (
        <div style={{ position: "absolute", left: 190, top: 1280, width: 700, padding: "20px 28px", boxSizing: "border-box", border: `3px solid ${BRAND.amber}`, borderRadius: 22, background: BRAND.paper, boxShadow: "9px 10px 0 rgba(194,65,12,0.10)", opacity: enter, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 25, fontWeight: 720, color: BRAND.inkSoft }}>{story.callout?.label ?? "Three yearly costs"}</div>
          <div style={{ fontFamily: TYPE.ui, fontSize: 66, lineHeight: 1, fontWeight: 860, color: BRAND.amber, letterSpacing: "-0.05em", whiteSpace: "nowrap" }}>{story.callout?.display ?? `€${total}`}</div>
        </div>
      )}
      {stage === "principle" && (
        <div style={{ position: "absolute", left: 100, right: 100, top: 610, padding: "58px 48px", border: `3px solid ${BRAND.amber}`, borderRadius: 28, background: BRAND.paper, boxShadow: "12px 14px 0 rgba(194,65,12,0.09)", opacity: enter, textAlign: "center" }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 35, fontWeight: 760, color: BRAND.inkSoft }}>€570 a year × 10 years</div>
          <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 112, lineHeight: 1, fontWeight: 880, letterSpacing: "-0.06em", color: BRAND.amber }}>€5,700</div>
          <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 27, fontWeight: 650, color: BRAND.inkMuted }}>Before any growth</div>
        </div>
      )}
      <div style={{ position: "absolute", left: 76, right: 150, top: 1450, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 550, color: BRAND.inkMuted }}>{story.disclosure}</div>
    </div>
  );
}

function DirectBarCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const beat = toolCardBeat(input);
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  const story = input.plan.barStory;
  if (!card || !story) return null;
  const hasFourRows = card.rows.length >= 4;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: hasFourRows ? 180 : 235, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }} data-reel-reveal><ToolCard card={card} compact /></div>
      {!hasFourRows && <div style={{ position: "absolute", left: 130, right: 150, top: 680, textAlign: "center", fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{story.disclosure}</div>}
      <div style={{ position: "absolute", left: 70, right: 100, top: hasFourRows ? 790 : 760, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 108, lineHeight: 1.01, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 47, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>
      <div style={{ position: "absolute", left: 120, right: 160, top: 1250, paddingTop: 32, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 58, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 760, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

function RepeatTestCard({ input, now }: { input: ReelInput; now: number }) {
  const blankBeat = multiplierBeat(input, "blank");
  const exampleBeat = multiplierBeat(input, "example");
  const closeBeat = barBeat(input, "close");
  const blankSpan = spanFor(input, blankBeat, "b6");
  const exampleSpan = spanFor(input, exampleBeat, "b7");
  const closeSpan = spanFor(input, closeBeat, "b8");
  if (now < blankSpan.startMs || now >= closeSpan.startMs + 450) return null;
  const blank = blankBeat?.anchor?.type === "multiplier" ? blankBeat.anchor : undefined;
  const example = exampleBeat?.anchor?.type === "multiplier" ? exampleBeat.anchor : undefined;
  const inExample = now >= exampleSpan.startMs;
  const rows = example?.rows ?? blank?.rows ?? [];
  const enter = progress(now, blankSpan.startMs, blankSpan.startMs + 420);
  const exit = progress(now, closeSpan.startMs, closeSpan.startMs + 420);
  const results = example?.results ?? [];
  const amount = inExample ? example?.amountLabel ?? "" : "€____";
  const footnote = inExample ? example?.footnote : blank?.footnote;
  const disclosure = footnote && /^illustrative\b/i.test(footnote)
    ? footnote
    : `Illustrative. ${footnote ?? ""}`.trim();
  return (
    <div style={{ position: "absolute", inset: 0, opacity: enter * (1 - exit) }}>
      <StoryHeading input={input} now={now} />
      <div style={{ position: "absolute", left: 82, top: 360, width: 886, height: 980, border: `3px solid ${BRAND.ink}`, borderRadius: 28, background: "rgba(255,255,255,0.74)", boxShadow: "12px 14px 0 rgba(0,33,113,0.09)", overflow: "hidden" }}>
        <div style={{ height: 142, padding: "25px 34px", background: BRAND.ink, color: BRAND.paper, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: TYPE.ui, fontSize: 20, fontWeight: 800, letterSpacing: "0.18em", color: "#9FE9DD" }}>THE REPEAT TEST</div>
            <div style={{ marginTop: 8, fontFamily: TYPE.ui, fontSize: 39, fontWeight: 760 }}>{amount}</div>
          </div>
          <div style={{ fontFamily: TYPE.ui, fontSize: 23, fontWeight: 700, color: "rgba(250,247,242,0.68)" }}>30 YEARS</div>
        </div>
        <div style={{ padding: "12px 34px 0" }}>
          {rows.slice(0, 4).map((row, index) => {
            const rowEnter = progress(now, blankSpan.startMs + 180 + index * 220, blankSpan.startMs + 650 + index * 220);
            const resultEnter = inExample ? progress(now, exampleSpan.startMs + 260 + index * 420, exampleSpan.startMs + 700 + index * 420) : 0;
            const result = results[index] ?? "";
            return (
              <div key={`${row.label}-${row.factor}`} style={{ height: rows.length <= 2 ? 330 : 190, display: "grid", gridTemplateColumns: "210px 1fr 220px", alignItems: "center", borderBottom: `2px solid ${BRAND.hairline}`, opacity: rowEnter }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 12, height: 82, borderRadius: 7, background: rowColor(row) }} />
                  <div style={{ fontFamily: TYPE.ui, fontSize: 29, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em", color: rowColor(row) }}>{row.label}</div>
                </div>
                <div style={{ fontFamily: TYPE.ui, fontSize: 82, fontWeight: 830, lineHeight: 1, letterSpacing: "-0.055em", color: rowColor(row) }}>× {factor(row.factor)}</div>
                <div style={{ fontFamily: TYPE.ui, fontSize: 58, fontWeight: 830, lineHeight: 1, textAlign: "right", color: rowColor(row), opacity: result ? resultEnter : 0 }}>{result}</div>
              </div>
            );
          })}
        </div>
        <div style={{ position: "absolute", left: 34, right: 34, bottom: 28, fontFamily: TYPE.ui, fontSize: 24, lineHeight: 1.34, fontWeight: 560, color: BRAND.inkMuted }}>{disclosure}</div>
      </div>
    </div>
  );
}

function SegmentedRow({
  bar,
  top,
  max,
  segmentLimit,
  segmentProgress = 1,
  compact = false,
}: {
  bar: BarDatum;
  top: number;
  max: number;
  segmentLimit?: number;
  segmentProgress?: number;
  compact?: boolean;
}) {
  const segments = bar.segments ?? [{ label: bar.label, value: bar.value, display: bar.display, tone: bar.tone }];
  const limit = segmentLimit === undefined ? segments.length : Math.max(0, Math.min(segmentLimit, segments.length));
  const complete = segments.slice(0, Math.max(0, limit - 1));
  const active = limit > 0 ? segments[limit - 1] : undefined;
  const visible = [...complete, ...(active ? [{ ...active, value: active.value * segmentProgress }] : [])];
  const visibleValue = visible.reduce((sum, segment) => sum + segment.value, 0);
  const trackWidth = compact ? 650 : 720;
  const height = compact ? 68 : 112;
  let cursor = 0;
  const renderedSegments = visible.map((segment) => {
    const width = (segment.value / max) * trackWidth;
    const estimatedLabelWidth = segment.display.length * (compact ? 15 : 19) + (compact ? 28 : 38);
    return { segment, width, canFitLabel: width >= Math.max(compact ? 116 : 145, estimatedLabelWidth) };
  });
  return (
    <div style={{ position: "absolute", left: 88, right: 82, top }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: compact ? 10 : 15 }}>
        <span style={{ fontFamily: TYPE.ui, fontSize: compact ? 27 : 32, fontWeight: 790, color: BRAND.ink }}>{bar.label}</span>
        {bar.sublabel && <span style={{ fontFamily: TYPE.ui, fontSize: compact ? 22 : 26, fontWeight: 650, color: BRAND.inkMuted }}>{bar.sublabel}</span>}
      </div>
      <div style={{ position: "relative", width: trackWidth, height }}>
        <div style={{ position: "absolute", inset: 0, borderRadius: 17, background: "rgba(0,33,113,0.055)" }} />
        {renderedSegments.map(({ segment, width, canFitLabel }, index) => {
          const left = cursor;
          cursor += width;
          const tone = segment.tone ?? bar.tone;
          const color = tone === "amber" ? BRAND.amber : tone === "teal" ? BRAND.teal : tone === "muted" ? "#8491A8" : BRAND.ink;
          return (
            <div key={`${bar.id}-${segment.label}-${index}`} style={{ position: "absolute", left, top: 0, width, height, background: color, borderRadius: index === 0 ? "17px 0 0 17px" : index === visible.length - 1 ? "0 17px 17px 0" : 0, overflow: "hidden", borderRight: index < visible.length - 1 ? `3px solid ${BRAND.paper}` : undefined }}>
              {canFitLabel && <div style={{ position: "absolute", inset: 0, padding: compact ? "0 12px" : "0 16px", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TYPE.ui, fontSize: compact ? 24 : 31, fontWeight: 830, color: BRAND.paper, whiteSpace: "nowrap" }}>{segment.display}</div>}
            </div>
          );
        })}
        {visibleValue > 0 && (
          <div style={{ position: "absolute", left: Math.min((visibleValue / max) * trackWidth + 18, trackWidth + 18), top: "50%", transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: compact ? 34 : 45, fontWeight: 840, lineHeight: 1, letterSpacing: "-0.04em", color: barTextColor(bar), whiteSpace: "nowrap" }}>
            {limit >= segments.length && segmentProgress > 0.98 ? bar.display : ""}
          </div>
        )}
      </div>
      {bar.segments && limit > 0 && (
        <div style={{ width: trackWidth, marginTop: compact ? 10 : 14, display: "flex", gap: 18, flexWrap: "wrap" }}>
          {segments.slice(0, limit).map((segment, index) => {
            const rendered = renderedSegments[index];
            const externalValue = rendered && !rendered.canFitLabel ? ` ${segment.display}` : "";
            return (
            <div key={`${bar.id}-legend-${segment.label}`} style={{ display: "flex", alignItems: "center", gap: 8, opacity: index === limit - 1 ? segmentProgress : 1, fontFamily: TYPE.ui, fontSize: compact ? 20 : 23, fontWeight: 690, color: BRAND.inkSoft }}>
              <span style={{ width: 12, height: 12, borderRadius: 6, background: segment.tone === "ink" ? BRAND.ink : segment.tone === "teal" ? BRAND.teal : BRAND.amber }} />{segment.label}{externalValue}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SegmentedHook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const story = plan.barStory;
  if (!story) return null;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  const receipts = story.bars[0];
  // The hook compares receipts with the pay line itself. Pension is revealed
  // later, so the question does not leak the final answer.
  const hidden = story.bars[1] ?? story.bars[2];
  const max = Math.max(receipts?.value ?? 0, hidden?.value ?? 0, 1);
  const baseline = cover ? 1360 : 1370;
  const chartHeight = cover ? 610 : 650;
  const barWidth = cover ? 300 : 320;
  const firstHeight = ((receipts?.value ?? 0) / max) * chartHeight;
  const secondHeight = ((hidden?.value ?? 0) / max) * chartHeight;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 820, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 92, top: cover ? 360 : 184, fontFamily: TYPE.ui, fontSize: cover ? 57 : 68, lineHeight: 1.03, fontWeight: 840, letterSpacing: "-0.04em", color: BRAND.ink }}>
        <div>{hook.onscreenLines[0]}</div>
        <div style={{ color: BRAND.amber }}>{hook.onscreenLines[1]}</div>
      </div>
      {[{ bar: receipts, x: cover ? 145 : 130, height: firstHeight, color: "#8491A8", value: receipts?.display }, { bar: hidden, x: cover ? 635 : 630, height: secondHeight, color: BRAND.amber, value: "?" }].map(({ bar, x, height, color, value }, index) => bar && (
        <div key={bar.id} style={{ position: "absolute", left: x, top: baseline - height, width: barWidth, height }}>
          <div style={{ position: "absolute", inset: 0, borderRadius: "24px 24px 10px 10px", background: color }} />
          <div style={{ position: "absolute", left: 18, right: 18, top: 28, textAlign: "center", fontFamily: TYPE.ui, fontSize: cover ? 47 : 55, fontWeight: 850, color: BRAND.paper }}>{value}</div>
          <div style={{ position: "absolute", left: -10, right: -10, top: height + 20, textAlign: "center", fontFamily: TYPE.ui, fontSize: cover ? 27 : 31, lineHeight: 1.12, fontWeight: 770, color: index === 0 ? BRAND.inkSoft : BRAND.amber }}>{bar.label}</div>
        </div>
      ))}
      <div style={{ position: "absolute", left: 110, right: 110, top: baseline, height: 4, background: BRAND.ink, opacity: 0.55 }} />
      {hook.onscreenLines[2] && <div style={{ position: "absolute", left: 78, top: cover ? 1480 : 1470, fontFamily: TYPE.ui, fontSize: 30, fontWeight: 720, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>}
      <div style={{ position: "absolute", left: 78, right: 120, top: cover ? 1535 : 1530, fontFamily: TYPE.ui, fontSize: cover ? 20 : 22, lineHeight: 1.28, fontWeight: 560, color: BRAND.inkMuted }}>{story.basis} · {story.disclosure}</div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1660, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function SegmentedBarVisual({ input, now }: { input: ReelInput; now: number }) {
  const story = input.plan.barStory;
  if (!story) return null;
  if (now < input.hookSpan.endMs) return <SegmentedHook plan={input.plan} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "bars" ? active.beat.anchor.stage : undefined;
  const segment = active?.beat.anchor?.type === "bars" ? active.beat.anchor.segment : undefined;
  const local = active ? progress(now, active.span.startMs + 100, active.span.startMs + 800) : 1;
  const receipts = story.bars[0];
  const pay = story.bars[1];
  const pension = story.bars[2];
  const max = Math.max(1, ...story.bars.map((bar) => bar.value));
  const beat = toolCardBeat(input);
  const toolSpan = spanFor(input, beat, "b7");
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;

  if (now >= toolSpan.startMs && card) {
    const enter = progress(now, toolSpan.startMs, toolSpan.startMs + 450);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <StoryHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}><ToolCard card={{ ...(card as ToolCardData), footnote: `${story.basis}. ${card.footnote ?? ""}`.trim() }} /></div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <StoryHeading input={input} now={now} />
      {stage === "first" && receipts && <SegmentedRow bar={receipts} top={690} max={max} segmentProgress={local} />}
      {stage === "second" && (
        <>
          {receipts && <SegmentedRow bar={receipts} top={560} max={max} />}
          {pay && <SegmentedRow bar={pay} top={930} max={max} segmentLimit={segment ?? 0} segmentProgress={local} />}
        </>
      )}
      {stage === "callout" && (
        <>
          {receipts && <SegmentedRow bar={receipts} top={540} max={max} />}
          {pay && <SegmentedRow bar={pay} top={900} max={max} segmentLimit={pay.segments?.length} />}
          <div style={{ position: "absolute", left: 250, top: 1280, width: 580, padding: "22px 30px", border: `3px solid ${BRAND.amber}`, borderRadius: 22, background: BRAND.paper, textAlign: "center", boxShadow: "9px 10px 0 rgba(201,121,26,0.10)" }}>
            <span style={{ fontFamily: TYPE.ui, fontSize: 49, fontWeight: 850, color: BRAND.amber }}>{pay?.display}</span>
            <span style={{ margin: "0 18px", fontFamily: TYPE.ui, fontSize: 42, fontWeight: 760, color: BRAND.inkSoft }}>&gt;</span>
            <span style={{ fontFamily: TYPE.ui, fontSize: 49, fontWeight: 850, color: BRAND.inkSoft }}>{receipts?.display}</span>
          </div>
        </>
      )}
      {stage === "third" && (
        <>
          {receipts && <SegmentedRow bar={receipts} top={520} max={max} compact />}
          {pay && <SegmentedRow bar={pay} top={790} max={max} segmentLimit={pay.segments?.length} compact />}
          {pension && <SegmentedRow bar={pension} top={1060} max={max} segmentLimit={pension.segments?.length} segmentProgress={local} compact />}
        </>
      )}
      <div style={{ position: "absolute", left: 76, right: 145, top: 1470, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{story.basis} · {story.disclosure}</div>
    </div>
  );
}

function SegmentedBarCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const beat = toolCardBeat(input);
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  const story = input.plan.barStory;
  if (!card || !story) return null;
  const hasFiveRows = card.rows.length > 4;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: hasFiveRows ? 200 : 235, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}><ToolCard card={{ ...card, footnote: `${story.basis}. ${card.footnote ?? ""}`.trim() }} compact /></div>
      <div style={{ position: "absolute", left: 130, right: 150, top: hasFiveRows ? 842 : 820, textAlign: "center", fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{story.basis} · {story.disclosure}</div>
      <div style={{ position: "absolute", left: 70, right: 100, top: hasFiveRows ? 902 : 880, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 108, lineHeight: 1.01, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 47, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>
      <div style={{ position: "absolute", left: 120, right: 160, top: 1290, paddingTop: 32, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 58, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 760, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

export function BarComparisonStory({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const now = (frame / fps) * 1000;
  if (input.plan.barStory?.mode === "segmented") return <SegmentedBarVisual input={input} now={now} />;
  if (input.plan.barStory?.mode === "direct") return <DirectBarVisual input={input} now={now} />;
  if (input.plan.barStory?.mode === "sum") return <SumBarVisual input={input} now={now} />;
  return (
    <>
      <BarVisual input={input} now={now} />
      <RepeatTestCard input={input} now={now} />
    </>
  );
}

export function BarComparisonCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (input.plan.barStory?.mode === "segmented") return <SegmentedBarCTA input={input} />;
  if (input.plan.barStory?.mode === "direct") return <DirectBarCTA input={input} />;
  if (input.plan.barStory?.mode === "sum") return <DirectBarCTA input={input} />;
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const exampleBeat = multiplierBeat(input, "example");
  const anchor = exampleBeat?.anchor?.type === "multiplier" ? exampleBeat.anchor : undefined;
  const rows = anchor?.rows ?? [];
  const story = input.plan.barStory;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: 315, width: 790, height: 405, padding: "28px 34px", borderRadius: 24, background: BRAND.paper, color: BRAND.ink, boxShadow: "14px 16px 0 rgba(0,0,0,0.18)", opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 21, fontWeight: 800, letterSpacing: "0.17em", color: BRAND.teal }}>THE REPEAT TEST</div>
        <div style={{ marginTop: 16 }}>
          {rows.slice(0, 2).map((row) => (
            <div key={row.label} style={{ height: 135, display: "grid", gridTemplateColumns: "180px 1fr", alignItems: "center", borderTop: `2px solid ${BRAND.hairline}`, color: rowColor(row) }}>
              <div style={{ fontFamily: TYPE.ui, fontSize: 25, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>{row.label}</div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 62, fontWeight: 840, textAlign: "right" }}>× {factor(row.factor)}</div>
            </div>
          ))}
        </div>
      </div>
      {story && <div style={{ position: "absolute", left: 130, right: 150, top: 750, textAlign: "center", fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{story.disclosure}</div>}
      <div style={{ position: "absolute", left: 80, right: 110, top: 825, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 116, lineHeight: 1.02, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 24, fontFamily: TYPE.ui, fontSize: 52, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>
      <div style={{ position: "absolute", left: 120, right: 160, top: 1240, paddingTop: 34, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 64, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 760, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

export function BarComparisonCover({ plan }: { plan: ReelPlan }) {
  const story = plan.barStory;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  if (story.mode === "segmented") return <SegmentedHook plan={plan} cover />;
  const bars = story.bars.slice(0, 4);
  const max = Math.max(1, ...bars.map((bar) => bar.value));

  if (bars.length > 2) {
    const stride = bars.length === 4 ? 218 : 276;
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", top: 278, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
        <div style={{ position: "absolute", left: 76, right: 100, top: 350, fontFamily: TYPE.ui, fontSize: 50, lineHeight: 1.03, fontWeight: 830, letterSpacing: "-0.04em", color: BRAND.ink }}>
          {hook.onscreenLines.map((line) => <div key={line}>{line}</div>)}
        </div>
        {bars.map((bar, index) => {
          const y = 610 + index * stride;
          const width = Math.max(96, (bar.value / max) * 690);
          return (
            <div key={bar.id} style={{ position: "absolute", left: 76, right: 90, top: y }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
                <span style={{ fontFamily: TYPE.ui, fontSize: 27, fontWeight: 790, color: BRAND.ink }}>{bar.label}</span>
                {bar.sublabel && <span style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 640, color: BRAND.inkMuted }}>{bar.sublabel}</span>}
              </div>
              <div style={{ position: "relative", height: 70 }}>
                <div style={{ position: "absolute", inset: 0, width: 690, borderRadius: 13, background: "rgba(0,33,113,0.055)" }} />
                <div style={{ position: "absolute", left: 0, top: 0, height: 70, width, borderRadius: 13, background: barColor(bar) }} />
                <div style={{ position: "absolute", left: Math.min(width + 16, 716), top: 35, transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: 36, fontWeight: 830, color: barTextColor(bar), whiteSpace: "nowrap" }}>{bar.display}</div>
              </div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 78, right: 100, top: 1480, fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.3, fontWeight: 600, color: BRAND.inkMuted }}>{story.disclosure}</div>
        <div style={{ position: "absolute", left: 80, top: 1600, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>
      </div>
    );
  }

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: 278, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      {bars.map((bar, index) => {
        const y = index === 0 ? 410 : 900;
        const width = Math.max(story.proportional ? 69 : 120, (bar.value / max) * 690);
        return (
          <div key={bar.id} style={{ position: "absolute", left: 76, right: 90, top: y }}>
            <div style={{ fontFamily: TYPE.ui, fontSize: 49, lineHeight: 1.05, fontWeight: 820, letterSpacing: "-0.035em", color: index === 0 ? BRAND.ink : BRAND.amber }}>{hook.onscreenLines[index]}</div>
            <div style={{ marginTop: 13, fontFamily: TYPE.ui, fontSize: 28, fontWeight: 720, color: BRAND.inkSoft }}>{bar.label} · {bar.sublabel}</div>
            <div style={{ position: "relative", height: 112, marginTop: 22 }}>
              <div style={{ position: "absolute", left: 0, top: 0, width: 690, height: 112, borderRadius: 18, background: "rgba(0,33,113,0.055)" }} />
              <div style={{ position: "absolute", left: 0, top: 0, width, height: 112, borderRadius: 18, background: barColor(bar) }} />
              <div style={{ position: "absolute", left: Math.min(width + 20, 718), top: 56, transform: "translateY(-50%)", fontFamily: TYPE.ui, fontSize: 49, fontWeight: 830, color: barTextColor(bar), whiteSpace: "nowrap" }}>{bar.display}</div>
            </div>
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 78, top: 1395, fontFamily: TYPE.ui, fontSize: 30, fontWeight: 680, color: BRAND.inkSoft }}>{hook.onscreenLines[2]}</div>
      <div style={{ position: "absolute", left: 78, right: 100, top: 1470, fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.3, fontWeight: 600, color: BRAND.inkMuted }}>{story.disclosure}</div>
      <div style={{ position: "absolute", left: 80, top: 1560, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 700, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>
    </div>
  );
}
