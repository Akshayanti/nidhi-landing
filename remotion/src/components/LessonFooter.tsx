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
  return (
    <>
      <div style={{ fontFamily: TYPE.ui, fontSize: 24, fontWeight: 800, letterSpacing: "0.2em", color: "#9FE9DD" }}>IN THE FULL LESSON</div>
      <div style={{ marginTop: 14 }}>
        {lines.slice(0, 3).map((line) => (
          <div key={line} style={{ fontFamily: TYPE.ui, fontSize: 35, lineHeight: 1.32, fontWeight: 650 }}>{line}</div>
        ))}
      </div>
      <div style={{ marginTop: 18, fontFamily: TYPE.ui, fontSize: 31, fontWeight: 700, color: "#9FE9DD" }}>nidhi.today · link in bio</div>
    </>
  );
}
