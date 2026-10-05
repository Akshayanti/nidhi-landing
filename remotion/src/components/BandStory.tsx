import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type BandDatum,
  type BandStage,
  type Beat,
  type BeatSpan,
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

function toneColor(tone: BandDatum["tone"]) {
  if (tone === "amber") return BRAND.amber;
  if (tone === "ink") return BRAND.ink;
  if (tone === "muted") return "#8491A8";
  return BRAND.teal;
}

function findBeat(input: ReelInput, predicate: (beat: Beat) => boolean) {
  return input.plan.beats.find(predicate);
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

function StoryHeading({ input, now }: { input: ReelInput; now: number }) {
  const active = currentBeat(input, now);
  if (!active || !["bands", "card"].includes(active.beat.anchor?.type ?? "")) return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 105, zIndex: 8, opacity, transform: `translateY(${(1 - opacity) * 10}px)` }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 60, fontWeight: 820, lineHeight: 1.04, letterSpacing: "-0.035em", color: BRAND.ink }}>{active.beat.onscreenText}</div>
      {active.beat.subtext && <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 630, lineHeight: 1.2, color: BRAND.inkSoft }}>{active.beat.subtext}</div>}
    </div>
  );
}

function BandPanel({ band, left, top, width, height, large = false, emphasis = false, opacity = 1 }: { band: BandDatum; left: number; top: number; width: number; height: number; large?: boolean; emphasis?: boolean; opacity?: number }) {
  const color = toneColor(band.tone);
  const pad = large ? 38 : 28;
  const roomy = height >= 500;
  const compact = !large && height < 340;
  const headerHeight = large ? (roomy ? 142 : 132) : compact ? 96 : 112;
  const bodyPad = large ? (roomy ? 28 : 20) : compact ? 10 : 18;
  const itemSize = large ? (roomy ? 36 : 32) : compact ? 23 : (height >= 380 ? 29 : 26);
  const rowHeight = Math.min(large ? (roomy ? 138 : 118) : 104, (height - headerHeight - bodyPad * 2) / Math.max(1, band.items.length));
  return (
    <div style={{ position: "absolute", left, top, width, height, border: `${emphasis ? 5 : 3}px solid ${color}`, borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.76)", boxShadow: emphasis ? "14px 16px 0 rgba(0,137,123,0.10)" : "10px 12px 0 rgba(0,33,113,0.06)", opacity }}>
      <div style={{ height: headerHeight, padding: large ? "25px 36px" : "20px 28px", boxSizing: "border-box", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, background: color, color: BRAND.paper }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: large ? 46 : 35, fontWeight: 860, lineHeight: 1 }}>{band.label}</div>
        <div style={{ padding: large ? "10px 18px" : "8px 14px", borderRadius: 999, background: BRAND.paper, fontFamily: TYPE.ui, fontSize: large ? 28 : 24, lineHeight: 1, fontWeight: 840, color }}>{band.cost}</div>
      </div>
      <div style={{ padding: `${bodyPad}px ${pad}px` }}>
        {band.items.map((item, index) => (
          <div key={item} style={{ height: rowHeight, padding: large ? "14px 0" : compact ? "4px 0" : "10px 0", boxSizing: "border-box", display: "grid", gridTemplateColumns: `${large ? 18 : 14}px 1fr`, gap: large ? 20 : 14, alignItems: "center", borderBottom: index < band.items.length - 1 ? `2px solid ${BRAND.hairline}` : undefined }}>
            <div style={{ width: large ? 14 : 11, height: large ? 14 : 11, borderRadius: 999, background: color }} />
            <div style={{ fontFamily: TYPE.ui, fontSize: itemSize, lineHeight: 1.16, fontWeight: 750, color: BRAND.ink }}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WeightedBands({ bands, top, hook = false, cover = false, emphasisId, opacity = 1 }: { bands: BandDatum[]; top: number; hook?: boolean; cover?: boolean; emphasisId?: string; opacity?: number }) {
  const [free, modest, hard] = bands;
  if (!free || !modest || !hard) return null;
  const side = cover ? 70 : 64;
  const gap = cover ? 28 : 30;
  const freeHeight = cover ? 480 : hook ? 520 : 460;
  const smallHeight = cover ? 360 : hook ? 420 : 380;
  const smallWidth = (1080 - side * 2 - gap) / 2;
  return (
    <div style={{ opacity }}>
      <BandPanel band={free} left={side} top={top} width={1080 - side * 2} height={freeHeight} large emphasis={emphasisId === free.id || hook} />
      <BandPanel band={modest} left={side} top={top + freeHeight + 30} width={smallWidth} height={smallHeight} emphasis={emphasisId === modest.id} />
      <BandPanel band={hard} left={side + smallWidth + gap} top={top + freeHeight + 30} width={smallWidth} height={smallHeight} emphasis={emphasisId === hard.id} />
    </div>
  );
}

function EqualBands({ bands, top, cover = false, opacity = 1 }: { bands: BandDatum[]; top: number; cover?: boolean; opacity?: number }) {
  const gap = cover ? 18 : 24;
  const height = cover ? 270 : 285;
  return (
    <div style={{ opacity }}>
      {bands.slice(0, 3).map((band, index) => (
        <BandPanel key={band.id} band={band} left={64} top={top + index * (height + gap)} width={952} height={height} />
      ))}
    </div>
  );
}

function AllBands({ plan, top, hook = false, cover = false, opacity = 1 }: { plan: ReelPlan; top: number; hook?: boolean; cover?: boolean; opacity?: number }) {
  const story = plan.bandStory;
  if (!story) return null;
  if (story.layout === "equal") return <EqualBands bands={story.bands} top={top} cover={cover} opacity={opacity} />;
  return <WeightedBands bands={story.bands} top={top} hook={hook} cover={cover} emphasisId={story.emphasis} opacity={opacity} />;
}

function ZeroRateBands({ bands, opacity }: { bands: BandDatum[]; opacity: number }) {
  return (
    <div style={{ opacity }}>
      {bands.slice(0, 3).map((band, index) => {
        const atZero = band.id === "spending";
        const color = toneColor(band.tone);
        return (
          <div key={band.id} style={{ position: "absolute", left: 78, top: 560 + index * 235, width: 924, height: 190, padding: "28px 32px", boxSizing: "border-box", display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", gap: 24, border: `${atZero ? 5 : 3}px solid ${color}`, borderRadius: 24, background: BRAND.paper, boxShadow: atZero ? "12px 14px 0 rgba(0,33,113,0.10)" : "8px 9px 0 rgba(0,33,113,0.05)" }}>
            <div>
              <div style={{ fontFamily: TYPE.ui, fontSize: 38, fontWeight: 850, lineHeight: 1.05, color }}>{band.label}</div>
              <div style={{ marginTop: 10, fontFamily: TYPE.ui, fontSize: 25, fontWeight: 680, color: BRAND.inkSoft }}>{band.cost}</div>
            </div>
            <div style={{ padding: "13px 20px", borderRadius: 999, background: atZero ? color : "rgba(0,33,113,0.07)", fontFamily: TYPE.ui, fontSize: 25, fontWeight: 830, color: atZero ? BRAND.paper : BRAND.inkSoft, whiteSpace: "nowrap" }}>{atZero ? "At 0%" : "Not at 0%"}</div>
          </div>
        );
      })}
    </div>
  );
}

function Hook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const story = plan.bandStory;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 820, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 350 : 178, fontFamily: TYPE.ui, color: BRAND.ink }}>
        <div style={{ fontSize: cover ? 76 : 88, lineHeight: 1.01, fontWeight: 850, letterSpacing: "-0.045em" }}>{hook.onscreenLines[0]}</div>
        <div style={{ marginTop: 8, fontSize: cover ? 59 : 68, lineHeight: 1.03, fontWeight: 850, letterSpacing: "-0.04em", color: BRAND.amber }}>{hook.onscreenLines[1]}</div>
      </div>
      <AllBands plan={plan} top={cover ? 550 : 400} hook cover={cover} />
      <div style={{ position: "absolute", left: 76, right: 130, top: cover ? 1460 : 1455, fontFamily: TYPE.ui, fontSize: cover ? 21 : 23, lineHeight: 1.3, fontWeight: 580, color: BRAND.inkMuted }}>{story.disclosure}</div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1585, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function SingleBand({ band, enter, emphasized = false, expanded = false }: { band: BandDatum; enter: number; emphasized?: boolean; expanded?: boolean }) {
  return <BandPanel band={band} left={expanded ? 78 : 98} top={500} width={expanded ? 924 : 884} height={expanded ? 760 : 620} large emphasis={emphasized} opacity={enter} />;
}

function BandsBody({ input, now, stage }: { input: ReelInput; now: number; stage: BandStage }) {
  const story = input.plan.bandStory!;
  const active = currentBeat(input, now);
  const enter = active ? progress(now, active.span.startMs + 80, active.span.startMs + 650) : 1;
  const selected = story.bands.find((band) => band.id === stage);
  if (selected) return <SingleBand band={selected} enter={enter} emphasized={selected.id === story.emphasis} expanded={story.layout === "equal"} />;
  if (stage === "all") return <AllBands plan={input.plan} top={500} opacity={enter} />;
  if (stage === "zero") return <ZeroRateBands bands={story.bands} opacity={enter} />;
  if (stage === "emphasis") {
    const free = story.bands.find((band) => band.id === story.emphasis) ?? story.bands[0];
    const others = story.bands.filter((band) => band.id !== free?.id);
    if (!free || others.length < 2) return null;
    return (
      <>
        <BandPanel band={free} left={78} top={500} width={924} height={520} large emphasis opacity={enter} />
        <div style={{ position: "absolute", left: 78, top: 1055, width: 924, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, opacity: enter }}>
          {others.map((band) => {
            const color = toneColor(band.tone);
            return <div key={band.id} style={{ height: 145, padding: "25px 28px", boxSizing: "border-box", border: `3px solid ${color}`, borderRadius: 22, background: BRAND.paper, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18 }}><div style={{ fontFamily: TYPE.ui, fontSize: 32, fontWeight: 840, color }}>{band.label}</div><div style={{ fontFamily: TYPE.ui, fontSize: 24, fontWeight: 720, color: BRAND.inkSoft }}>{band.cost}</div></div>;
          })}
        </div>
      </>
    );
  }
  return <AllBands plan={input.plan} top={500} opacity={enter} />;
}

function Visual({ input, now }: { input: ReelInput; now: number }) {
  if (!input.plan.bandStory) return null;
  if (now < input.hookSpan.endMs) return <Hook plan={input.plan} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "bands" ? active.beat.anchor.stage : undefined;
  const toolBeat = cardBeat(input);
  const toolSpan = spanFor(input, toolBeat, "b6");
  const tool = toolBeat?.anchor?.type === "card" ? toolBeat.anchor : undefined;
  if (now >= toolSpan.startMs && now < toolSpan.endMs && tool) {
    const enter = progress(now, toolSpan.startMs, toolSpan.startMs + 450);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <StoryHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }} data-reel-reveal><ToolCard card={tool as ToolCardData} /></div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <StoryHeading input={input} now={now} />
      {stage && <BandsBody input={input} now={now} stage={stage} />}
      <div style={{ position: "absolute", left: 76, right: 145, top: 1480, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{input.plan.bandStory.disclosure}</div>
    </div>
  );
}

export function BandStoryView({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Visual input={input} now={(frame / fps) * 1000} />;
}

export function BandStoryCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const beat = cardBeat(input);
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  if (!card || !input.plan.bandStory) return null;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: 200, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }} data-reel-reveal><ToolCard card={card} compact /></div>
      {input.plan.bandStory.layout !== "equal" && <div style={{ position: "absolute", left: 130, right: 150, top: 842, textAlign: "center", fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{input.plan.bandStory.disclosure}</div>}
      <div style={{ position: "absolute", left: 70, right: 100, top: 900, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 92, lineHeight: 1.01, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 20, fontFamily: TYPE.ui, fontSize: 43, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
      </div>
      <div style={{ position: "absolute", left: 120, right: 160, top: 1300, paddingTop: 32, borderTop: "1px solid rgba(250,247,242,0.22)", textAlign: "center", opacity: details }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
        <div style={{ marginTop: 58, fontFamily: TYPE.ui, fontSize: 36, fontWeight: 760, letterSpacing: "0.08em" }}>{input.plan.cta.handle}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.25, fontWeight: 520, color: "rgba(250,247,242,0.62)", opacity: maker }}>nidhi, a planner in the making · free tools live today</div>
      </div>
    </div>
  );
}

export function BandStoryCover({ plan }: { plan: ReelPlan }) {
  return <Hook plan={plan} cover />;
}
