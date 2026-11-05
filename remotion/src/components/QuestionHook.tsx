import { BRAND, TYPE, type ReelPlan } from "../data";

// A hook that is only the viewer's question: the topic chip, then the two
// hook lines large on an otherwise quiet frame. Used when a chart or band map
// in the hook would show what the voice has not said yet (`hookStyle: "question"`).
export function QuestionHook({ plan, cover = false }: { plan: ReelPlan; cover?: boolean }) {
  const hook = plan.hookVariants[plan.useHookVariant] ?? plan.hookVariants[0];
  if (!hook) return null;
  const [first, second] = hook.onscreenLines;
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <div style={{ position: "absolute", left: 76, right: 90, top: cover ? 560 : 600, fontFamily: TYPE.ui }}>
        {plan.topicChip && <div style={{ fontSize: 26, fontWeight: 820, letterSpacing: "0.18em", color: BRAND.teal, marginBottom: 34 }}>{plan.topicChip}</div>}
        <div style={{ fontSize: cover ? 92 : 100, lineHeight: 1.02, fontWeight: 850, letterSpacing: "-0.045em", color: BRAND.ink }}>{first}</div>
        {second && <div style={{ marginTop: 26, fontSize: cover ? 74 : 80, lineHeight: 1.04, fontWeight: 850, letterSpacing: "-0.04em", color: BRAND.amber }}>{second}</div>}
      </div>
      {cover && <div style={{ position: "absolute", left: 80, top: 1585, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 720, letterSpacing: "0.08em", color: BRAND.ink }}>@nidhi.today</div>}
    </div>
  );
}
