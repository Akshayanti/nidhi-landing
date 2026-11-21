import { TYPE, type ReelPlan } from "../data";

/** How far an end card's footer moves up to make room for the lesson lines. */
export function lessonLift(plan: ReelPlan) {
  const lines = plan.lessonBlock?.length ?? 0;
  return lines > 0 ? 40 + lines * 46 : 0;
}

/**
 * The top of an end card's footer. With `plan.lessonBlock` it says what the
 * full lesson adds beyond the reel, then where to find it; without, it is the
 * older "FULL ASSUMPTIONS / nidhi.today" pair.
 */
export function LessonFooter({ plan }: { plan: ReelPlan }) {
  const lines = plan.lessonBlock ?? [];
  if (lines.length === 0) {
    return (
      <>
        <div style={{ fontFamily: TYPE.ui, fontSize: 22, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>FULL ASSUMPTIONS</div>
        <div style={{ marginTop: 14, fontFamily: TYPE.ui, fontSize: 34, fontWeight: 650 }}>nidhi.today</div>
      </>
    );
  }
  // Left aligned, one bullet per point, so the lines read as separate things the lesson adds.
  return (
    <div style={{ display: "inline-block", textAlign: "left", maxWidth: 760 }}>
      <div style={{ fontFamily: TYPE.ui, fontSize: 24, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>IN THE FULL LESSON</div>
      <div style={{ marginTop: 16 }}>
        {lines.slice(0, 3).map((line) => (
          <div key={line} style={{ display: "flex", alignItems: "baseline", gap: 16, marginTop: 6, fontFamily: TYPE.ui, fontSize: 35, lineHeight: 1.28, fontWeight: 650 }}>
            <span style={{ flex: "none", width: 12, height: 12, borderRadius: 6, background: "#9FE9DD", transform: "translateY(-5px)" }} />
            <span>{line}</span>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 20, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 700, color: "#9FE9DD" }}>nidhi.today · link in bio</div>
    </div>
  );
}
