import { useCurrentFrame, useVideoConfig } from "remotion";
import {
  BRAND,
  TYPE,
  type Beat,
  type BeatSpan,
  type ReelInput,
  type ReelPlan,
  type RouteDatum,
  type RouteStage,
  type ToolCardData,
} from "../data";
import { ToolCard } from "./ToolCard";

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const ease = (value: number) => {
  const t = clamp(value);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const progress = (now: number, start: number, end: number) => ease((now - start) / Math.max(1, end - start));

function toneColor(tone: RouteDatum["tone"]) {
  if (tone === "amber") return BRAND.amber;
  if (tone === "ink") return BRAND.ink;
  if (tone === "muted") return "#8491A8";
  return BRAND.teal;
}

function findBeat(input: ReelInput, predicate: (beat: Beat) => boolean) {
  return input.plan.beats.find(predicate);
}

function routeBeat(input: ReelInput, stage: RouteStage) {
  return findBeat(input, (beat) => beat.anchor?.type === "routes" && beat.anchor.stage === stage);
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
  if (!active || !["routes", "card"].includes(active.beat.anchor?.type ?? "")) return null;
  const local = (now - active.span.startMs) / Math.max(1, active.span.endMs - active.span.startMs);
  const opacity = Math.min(ease(local / 0.08), ease((1 - local) / 0.05));
  return (
    <div style={{ position: "absolute", top: 238, left: 72, right: 105, zIndex: 8, opacity, transform: `translateY(${(1 - opacity) * 10}px)` }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 60, fontWeight: 820, lineHeight: 1.04, letterSpacing: "-0.035em", color: BRAND.ink }}>{active.beat.onscreenText}</div>
      {active.beat.subtext && <div style={{ marginTop: 12, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 630, lineHeight: 1.2, color: BRAND.inkSoft }}>{active.beat.subtext}</div>}
    </div>
  );
}

function AssetCard({ label, display, top, compact = false, hero = false }: { label: string; display: string; top: number; compact?: boolean; hero?: boolean }) {
  const left = hero ? 90 : compact ? 230 : 205;
  const width = hero ? 900 : compact ? 620 : 670;
  const height = hero ? (compact ? 190 : 220) : compact ? 154 : 180;
  return (
    <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", padding: hero ? (compact ? "24px 34px" : "30px 42px") : compact ? "24px 32px" : "28px 38px", border: `3px solid ${BRAND.ink}`, borderRadius: 26, background: BRAND.paper, boxShadow: "10px 12px 0 rgba(0,33,113,0.08)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
      <div style={{ maxWidth: hero ? 410 : undefined, fontFamily: TYPE.ui, fontSize: hero ? (compact ? 34 : 40) : compact ? 29 : 34, lineHeight: 1.08, fontWeight: 760, color: BRAND.ink }}>{label}</div>
      <div style={{ fontFamily: TYPE.ui, fontSize: hero ? (compact ? 70 : 82) : compact ? 61 : 72, lineHeight: 1, fontWeight: 860, letterSpacing: "-0.045em", color: BRAND.ink, whiteSpace: "nowrap" }}>{display}</div>
    </div>
  );
}

function RouteCard({ route, left, top, width, height, active = true, fieldState = "native", hero = false }: { route: RouteDatum; left: number; top: number; width: number; height: number; active?: boolean; fieldState?: "native" | "empty" | "filled"; hero?: boolean }) {
  const color = toneColor(route.tone);
  const filled = fieldState === "filled" || (fieldState === "native" && route.state === "default");
  const headerHeight = hero ? 142 : 116;
  return (
    <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", border: `3px ${route.state === "empty" && !filled ? "dashed" : "solid"} ${color}`, borderRadius: 28, overflow: "hidden", background: "rgba(255,255,255,0.72)", boxShadow: "10px 12px 0 rgba(0,33,113,0.06)", opacity: active ? 1 : 0.24 }}>
      <div style={{ height: headerHeight, boxSizing: "border-box", padding: hero ? "31px 30px" : "24px 28px", display: "flex", alignItems: "center", background: color, color: BRAND.paper }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: hero ? 38 : 33, fontWeight: 820, lineHeight: 1.08 }}>{route.label}</div>
      </div>
      <div style={{ padding: hero ? "34px 30px" : "24px 28px" }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: hero ? 47 : 41, lineHeight: 1.08, fontWeight: 840, letterSpacing: "-0.025em", color }}>{route.rule}</div>
        <div style={{ marginTop: hero ? 42 : 22, minHeight: hero ? 142 : 110, boxSizing: "border-box", padding: hero ? "16px 20px" : "12px 18px", border: `3px ${filled ? "solid" : "dashed"} ${color}`, borderRadius: 17, display: "flex", alignItems: "center", gap: hero ? 17 : 14, background: filled ? `${color}12` : BRAND.paper }}>
          <div style={{ width: hero ? 38 : 34, height: hero ? 38 : 34, flex: "none", border: `3px solid ${color}`, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: TYPE.ui, fontSize: hero ? 30 : 27, fontWeight: 900, color }}>{filled ? "✓" : ""}</div>
          <div style={{ fontFamily: TYPE.ui, fontSize: hero ? 32 : 30, lineHeight: 1.12, fontWeight: 750, color: filled ? BRAND.ink : BRAND.inkMuted }}>{filled ? (route.fix ?? "Covered by the scheme rule") : "Beneficiary not named"}</div>
        </div>
      </div>
    </div>
  );
}

function RouteLines({ stage, top, opacity = 1, leftX = 294, rightX = 786 }: { stage: RouteStage | "hook"; top: number; opacity?: number; leftX?: number; rightX?: number }) {
  const leftOn = stage === "hook" || stage === "rule" || stage === "spouse" || stage === "left" || stage === "asset";
  const rightOn = stage === "fix";
  const rightDashed = stage === "hook" || stage === "rule" || stage === "fallback" || stage === "risk" || stage === "asset";
  return (
    <svg width="1080" height="820" viewBox="0 0 1080 820" style={{ position: "absolute", left: 0, top, overflow: "visible", opacity }} aria-hidden="true">
      <path d={`M540 0 V80 H${leftX} V154`} fill="none" stroke={leftOn ? BRAND.teal : BRAND.hairline} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M540 80 H${rightX} V154`} fill="none" stroke={rightOn ? BRAND.teal : BRAND.amber} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={rightDashed && !rightOn ? "18 18" : undefined} />
      <circle cx="540" cy="80" r="11" fill={BRAND.ink} />
      <circle cx={leftX} cy="154" r="11" fill={leftOn ? BRAND.teal : BRAND.hairline} />
      <circle cx={rightX} cy="154" r="11" fill={rightOn ? BRAND.teal : BRAND.amber} />
    </svg>
  );
}

function TransferRouteCard({ route, left, top, width, height, active = true }: { route: RouteDatum; left: number; top: number; width: number; height: number; active?: boolean }) {
  const color = toneColor(route.tone);
  return (
    <div style={{ position: "absolute", left, top, width, height, boxSizing: "border-box", border: `3px solid ${color}`, borderRadius: 28, overflow: "hidden", background: BRAND.paper, boxShadow: "10px 12px 0 rgba(0,33,113,0.06)", opacity: active ? 1 : 0.22 }}>
      <div style={{ minHeight: 116, padding: "24px 28px", boxSizing: "border-box", display: "flex", alignItems: "center", background: color, color: BRAND.paper, fontFamily: TYPE.ui, fontSize: 33, lineHeight: 1.08, fontWeight: 830 }}>{route.label}</div>
      <div style={{ padding: "34px 30px" }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 41, lineHeight: 1.08, fontWeight: 850, letterSpacing: "-0.025em", color }}>{route.rule}</div>
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: `2px solid ${BRAND.hairline}`, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.22, fontWeight: 690, color: BRAND.inkSoft }}>{route.id === "direct" ? "Never paid to you" : "Paid to you first"}</div>
      </div>
    </div>
  );
}

function TransferHook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const story = plan.routeStory;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  const [leftRoute, rightRoute] = story.routes;
  const assetTop = cover ? 540 : 480;
  const assetHeight = cover ? 190 : 220;
  const routeTop = cover ? 885 : 855;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 820, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 350 : 178, fontFamily: TYPE.ui, color: BRAND.ink }}>
        <div style={{ fontSize: cover ? 68 : 82, lineHeight: 1.01, fontWeight: 850, letterSpacing: "-0.045em" }}>{hook.onscreenLines[0]}</div>
        <div style={{ marginTop: 15, fontSize: cover ? 35 : 40, lineHeight: 1.08, fontWeight: 750, color: BRAND.amber }}>{hook.onscreenLines[1]}</div>
      </div>
      <AssetCard label={story.asset.label} display={story.asset.display} top={assetTop} compact={cover} hero />
      <RouteLines stage="hook" top={assetTop + assetHeight} leftX={cover ? 290 : 285} rightX={cover ? 790 : 795} />
      {leftRoute && <TransferRouteCard route={leftRoute} left={cover ? 52 : 42} top={routeTop} width={cover ? 476 : 486} height={cover ? 500 : 520} />}
      {rightRoute && <TransferRouteCard route={rightRoute} left={cover ? 552 : 552} top={routeTop} width={cover ? 476 : 486} height={cover ? 500 : 520} />}
      <div style={{ position: "absolute", left: 78, right: 120, top: cover ? 1470 : 1532, fontFamily: TYPE.ui, fontSize: cover ? 23 : 25, lineHeight: 1.3, fontWeight: 600, color: BRAND.inkMuted }}>{story.disclosure}</div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1585, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function Hook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const story = plan.routeStory;
  if (story?.mode === "transfer") return <TransferHook plan={plan} cover={cover} />;
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!story || !hook) return null;
  const [leftRoute, rightRoute] = story.routes;
  const assetTop = cover ? 540 : 480;
  const assetHeight = cover ? 190 : 220;
  const routeTop = cover ? 885 : 855;
  const routeHeight = cover ? 550 : 650;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", top: cover ? 278 : 104, left: 76, fontFamily: TYPE.ui, fontSize: 22, fontWeight: 820, letterSpacing: "0.2em", color: BRAND.teal }}>ILLUSTRATIVE</div>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 350 : 178, fontFamily: TYPE.ui, color: BRAND.ink }}>
        <div style={{ fontSize: cover ? 74 : 88, lineHeight: 1.01, fontWeight: 850, letterSpacing: "-0.045em" }}>{hook.onscreenLines[0]}</div>
        <div style={{ marginTop: 15, fontSize: cover ? 35 : 40, lineHeight: 1.08, fontWeight: 750, color: BRAND.inkSoft }}>{hook.onscreenLines[1]}</div>
      </div>
      <AssetCard label={story.asset.label} display={story.asset.display} top={assetTop} compact={cover} hero />
      <RouteLines stage="hook" top={assetTop + assetHeight} leftX={cover ? 290 : 285} rightX={cover ? 790 : 795} />
      {leftRoute && <RouteCard route={leftRoute} left={cover ? 52 : 42} top={routeTop} width={cover ? 476 : 486} height={routeHeight} hero />}
      {rightRoute && <RouteCard route={rightRoute} left={cover ? 552 : 552} top={routeTop} width={cover ? 476 : 486} height={routeHeight} fieldState="empty" hero />}
      <div style={{ position: "absolute", left: 78, right: 120, top: cover ? 1470 : 1532, fontFamily: TYPE.ui, fontSize: cover ? 23 : 25, lineHeight: 1.3, fontWeight: 600, color: BRAND.inkMuted }}>{story.disclosure}</div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1585, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}

function TransferBodyRouteMap({ input, now, stage }: { input: ReelInput; now: number; stage: RouteStage }) {
  const story = input.plan.routeStory!;
  const active = currentBeat(input, now);
  const enter = active ? progress(now, active.span.startMs + 100, active.span.startMs + 750) : 1;
  const [leftRoute, rightRoute] = story.routes;
  if (stage === "asset") return <AssetCard label={story.asset.label} display={story.asset.display} top={590} hero />;
  if (stage === "workaround") {
    const content = story.workaround ?? { label: active?.beat.onscreenText ?? "Stop", note: active?.beat.subtext ?? "Ask for the direct route" };
    return (
      <div style={{ position: "absolute", left: 100, right: 100, top: 570, padding: "54px 48px", border: `4px solid ${BRAND.amber}`, borderRadius: 30, background: BRAND.paper, boxShadow: "12px 14px 0 rgba(194,65,12,0.10)", opacity: enter, textAlign: "center" }}>
        <div style={{ fontFamily: TYPE.ui, fontSize: 34, lineHeight: 1.15, fontWeight: 780, color: BRAND.inkSoft }}>{content.label}</div>
        <div style={{ marginTop: 28, fontFamily: TYPE.ui, fontSize: 72, lineHeight: 1.04, fontWeight: 880, letterSpacing: "-0.045em", color: BRAND.amber }}>{content.note}</div>
      </div>
    );
  }
  if (stage === "fix") {
    return (
      <>
        {leftRoute && <TransferRouteCard route={leftRoute} left={175} top={560} width={730} height={420} />}
        <div style={{ position: "absolute", left: 175, top: 1040, width: 730, padding: "28px 34px", boxSizing: "border-box", borderRadius: 22, background: "rgba(0,137,123,0.10)", border: `3px solid ${BRAND.teal}`, opacity: enter, textAlign: "center", fontFamily: TYPE.ui, fontSize: 33, lineHeight: 1.15, fontWeight: 810, color: BRAND.teal }}>Your new provider requests it</div>
      </>
    );
  }
  const leftActive = stage === "rule" || stage === "left";
  const rightActive = stage === "rule" || stage === "risk";
  return (
    <>
      <AssetCard label={story.asset.label} display={story.asset.display} top={445} compact />
      <RouteLines stage={stage} top={599} opacity={enter} />
      {leftRoute && <TransferRouteCard route={leftRoute} left={64} top={755} width={458} height={380} active={leftActive} />}
      {rightRoute && <TransferRouteCard route={rightRoute} left={558} top={755} width={458} height={380} active={rightActive} />}
      {stage === "risk" && (
        <div style={{ position: "absolute", left: 590, top: 1170, width: 390, minHeight: 160, padding: "24px 28px", boxSizing: "border-box", border: `3px solid ${BRAND.amber}`, borderRadius: 22, background: BRAND.paper, opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 34, fontWeight: 840, color: BRAND.amber }}>{story.fallback.label}</div>
          <div style={{ marginTop: 10, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.2, fontWeight: 620, color: BRAND.inkSoft }}>{story.fallback.note}</div>
        </div>
      )}
    </>
  );
}

function BodyRouteMap({ input, now, stage }: { input: ReelInput; now: number; stage: RouteStage }) {
  const story = input.plan.routeStory!;
  if (story.mode === "transfer") return <TransferBodyRouteMap input={input} now={now} stage={stage} />;
  const active = currentBeat(input, now);
  const enter = active ? progress(now, active.span.startMs + 100, active.span.startMs + 750) : 1;
  const [leftRoute, rightRoute] = story.routes;
  if (stage === "asset") {
    return (
      <>
        <AssetCard label={story.asset.label} display={story.asset.display} top={510} />
        <div style={{ position: "absolute", left: 115, top: 820, width: 390, height: 300, padding: "34px", border: `3px solid ${BRAND.teal}`, borderRadius: 26, background: "rgba(255,255,255,0.7)", opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 31, fontWeight: 820, color: BRAND.ink }}>Employee one</div>
          <div style={{ marginTop: 30, fontFamily: TYPE.ui, fontSize: 39, fontWeight: 840, color: BRAND.teal }}>Married partner</div>
          <div style={{ marginTop: 16, fontFamily: TYPE.ui, fontSize: 26, lineHeight: 1.2, fontWeight: 620, color: BRAND.inkSoft }}>Together for 15 years</div>
        </div>
        <div style={{ position: "absolute", left: 575, top: 820, width: 390, height: 300, padding: "34px", border: `3px solid ${BRAND.amber}`, borderRadius: 26, background: "rgba(255,255,255,0.7)", opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 31, fontWeight: 820, color: BRAND.ink }}>Employee two</div>
          <div style={{ marginTop: 30, fontFamily: TYPE.ui, fontSize: 39, fontWeight: 840, color: BRAND.amber }}>Unmarried partner</div>
          <div style={{ marginTop: 16, fontFamily: TYPE.ui, fontSize: 26, lineHeight: 1.2, fontWeight: 620, color: BRAND.inkSoft }}>Together for 15 years</div>
        </div>
      </>
    );
  }

  if (stage === "workaround") {
    const pieces = (active?.beat.subtext ?? "A will, plus life cover they own").split(/,\s*plus\s*/i);
    return (
      <>
        <div style={{ position: "absolute", left: 108, right: 108, top: 530, padding: "34px 38px", border: `3px dashed ${BRAND.amber}`, borderRadius: 25, background: "rgba(201,121,26,0.07)", textAlign: "center", opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 27, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.amber }}>When the form is not accepted</div>
        </div>
        <div style={{ position: "absolute", left: 108, top: 730, width: 410, height: 360, padding: "42px 38px", border: `3px solid ${BRAND.ink}`, borderRadius: 28, background: BRAND.paper, boxShadow: "10px 12px 0 rgba(0,33,113,0.07)", opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 25, fontWeight: 820, letterSpacing: "0.12em", color: BRAND.inkMuted }}>01</div>
          <div style={{ marginTop: 64, fontFamily: TYPE.ui, fontSize: 55, lineHeight: 1.05, fontWeight: 850, color: BRAND.ink }}>{pieces[0]}</div>
        </div>
        <div style={{ position: "absolute", left: 562, top: 730, width: 410, height: 360, padding: "42px 38px", border: `3px solid ${BRAND.amber}`, borderRadius: 28, background: BRAND.paper, boxShadow: "10px 12px 0 rgba(0,33,113,0.07)", opacity: enter }}>
          <div style={{ fontFamily: TYPE.ui, fontSize: 25, fontWeight: 820, letterSpacing: "0.12em", color: BRAND.amber }}>02</div>
          <div style={{ marginTop: 52, fontFamily: TYPE.ui, fontSize: 48, lineHeight: 1.06, fontWeight: 850, color: BRAND.amber }}>{pieces[1] ?? "Life cover they own"}</div>
        </div>
      </>
    );
  }

  const fieldState = stage === "fix" ? "filled" : "empty";
  const leftActive = stage !== "fallback" && stage !== "fix" ? true : stage === "fix" ? false : false;
  const rightActive = stage === "fallback" || stage === "fix" || stage === "rule";
  return (
    <>
      <AssetCard label={story.asset.label} display={story.asset.display} top={445} compact />
      <RouteLines stage={stage} top={599} opacity={enter} />
      {leftRoute && <RouteCard route={leftRoute} left={64} top={755} width={458} height={430} active={stage === "spouse" || stage === "rule" ? true : leftActive} />}
      {rightRoute && <RouteCard route={rightRoute} left={558} top={755} width={458} height={430} active={rightActive} fieldState={fieldState} />}
      {stage === "fallback" && (
        <>
          <svg width="1080" height="155" viewBox="0 0 1080 155" style={{ position: "absolute", left: 0, top: 1165, overflow: "visible", opacity: enter }} aria-hidden="true">
            <path d="M786 0 V58" fill="none" stroke={BRAND.amber} strokeWidth="7" strokeDasharray="16 14" strokeLinecap="round" />
            <path d="M770 60 H802 L786 84 Z" fill={BRAND.amber} />
          </svg>
          <div style={{ position: "absolute", left: 590, top: 1260, width: 390, minHeight: 150, padding: "24px 28px", border: `3px solid ${BRAND.amber}`, borderRadius: 22, background: BRAND.paper, opacity: enter }}>
            <div style={{ fontFamily: TYPE.ui, fontSize: 36, fontWeight: 840, color: BRAND.amber }}>{story.fallback.label}</div>
            <div style={{ marginTop: 10, fontFamily: TYPE.ui, fontSize: 25, lineHeight: 1.2, fontWeight: 620, color: BRAND.inkSoft }}>{story.fallback.note}</div>
          </div>
        </>
      )}
    </>
  );
}

function Visual({ input, now }: { input: ReelInput; now: number }) {
  if (!input.plan.routeStory) return null;
  if (now < input.hookSpan.endMs) return <Hook plan={input.plan} />;
  const active = currentBeat(input, now);
  const stage = active?.beat.anchor?.type === "routes" ? active.beat.anchor.stage : undefined;
  const toolBeat = cardBeat(input);
  const toolSpan = spanFor(input, toolBeat, "b7");
  const tool = toolBeat?.anchor?.type === "card" ? toolBeat.anchor : undefined;
  if (now >= toolSpan.startMs && tool) {
    const enter = progress(now, toolSpan.startMs, toolSpan.startMs + 450);
    return (
      <div style={{ position: "absolute", inset: 0 }}>
        <StoryHeading input={input} now={now} />
        <div style={{ position: "absolute", left: 97, top: 420, opacity: enter, transform: `translateY(${(1 - enter) * 18}px)` }}><ToolCard card={tool as ToolCardData} /></div>
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <StoryHeading input={input} now={now} />
      {stage && <BodyRouteMap input={input} now={now} stage={stage} />}
      <div style={{ position: "absolute", left: 76, right: 145, top: 1480, fontFamily: TYPE.ui, fontSize: 23, lineHeight: 1.3, fontWeight: 560, color: BRAND.inkMuted }}>{input.plan.routeStory.disclosure}</div>
    </div>
  );
}

export function RouteStoryView({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return <Visual input={input} now={(frame / fps) * 1000} />;
}

export function RouteStoryCTA({ input }: { input: ReelInput }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = progress(frame, 0, fps * 0.45);
  const details = progress(frame, fps * 0.35, fps * 0.9);
  const maker = progress(frame, fps * 1.05, fps * 1.6);
  const beat = cardBeat(input);
  const card = beat?.anchor?.type === "card" ? beat.anchor : undefined;
  if (!card || !input.plan.routeStory) return null;
  return (
    <div style={{ position: "absolute", inset: 0, color: BRAND.paper }}>
      <div style={{ position: "absolute", left: 145, top: 290, opacity: enter, transform: `translateY(${(1 - enter) * 20}px) rotate(-1deg)` }}><ToolCard card={card} compact /></div>
      <div style={{ position: "absolute", left: 130, right: 150, top: 880, textAlign: "center", fontFamily: TYPE.ui, fontSize: 22, lineHeight: 1.25, fontWeight: 650, color: "rgba(250,247,242,0.68)", opacity: enter }}>{input.plan.routeStory.disclosure}</div>
      <div style={{ position: "absolute", left: 70, right: 100, top: 935, textAlign: "center", opacity: enter }}>
        <div style={{ fontFamily: TYPE.display, fontSize: 102, lineHeight: 1.01, fontWeight: 800, letterSpacing: "-0.035em" }}>{input.plan.cta.onscreenText}</div>
        <div style={{ marginTop: 22, fontFamily: TYPE.ui, fontSize: 46, fontWeight: 760, lineHeight: 1.1, color: "#9FE9DD" }}>{input.plan.cta.subtext}</div>
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

export function RouteStoryCover({ plan }: { plan: ReelPlan }) {
  return <Hook plan={plan} cover />;
}
