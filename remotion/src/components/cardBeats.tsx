import type { Beat, ReelInput, ToolCardData } from "../data";
import { ToolCard } from "./ToolCard";

/**
 * Tool cards can build over several beats: a checklist gains a row each beat (owner, Nov 5, 2026:
 * "the stress test makes a good reel, with a checklist"). A card beat that directly follows another
 * card beat with the same title keeps the earlier rows still and fades in only the new ones.
 */
export function lastCardBeat(input: ReelInput): Beat | undefined {
  return [...input.plan.beats].reverse().find((beat) => beat.anchor?.type === "card");
}

function rowsAlreadyShown(input: ReelInput, beat: Beat): number {
  const index = input.plan.beats.findIndex((item) => item.id === beat.id);
  const previous = index > 0 ? input.plan.beats[index - 1] : undefined;
  if (previous?.anchor?.type !== "card" || beat.anchor?.type !== "card") return 0;
  return previous.anchor.title === beat.anchor.title ? previous.anchor.rows.length : 0;
}

/** The last card of a run of consecutive card beats sharing this beat's title: it sets the layout. */
function fullCard(input: ReelInput, beat: Beat): ToolCardData | undefined {
  if (beat.anchor?.type !== "card") return undefined;
  const beats = input.plan.beats;
  let index = beats.findIndex((item) => item.id === beat.id);
  let card = beat.anchor as ToolCardData;
  while (index + 1 < beats.length) {
    const next = beats[index + 1].anchor;
    if (next?.type !== "card" || next.title !== card.title) break;
    card = next as ToolCardData;
    index += 1;
  }
  return card;
}

export function ActiveCard({ input, beat, enter }: { input: ReelInput; beat: Beat; enter: number }) {
  if (beat.anchor?.type !== "card") return null;
  const shown = rowsAlreadyShown(input, beat);
  const cardEnter = shown > 0 ? 1 : enter;
  return (
    <div style={{ position: "absolute", left: 97, top: 420, opacity: cardEnter, transform: `translateY(${(1 - cardEnter) * 18}px)` }} data-reel-reveal>
      <ToolCard card={fullCard(input, beat) ?? (beat.anchor as ToolCardData)} visibleRows={beat.anchor.rows.length} newFrom={shown > 0 ? shown : undefined} newReveal={enter} />
    </div>
  );
}
