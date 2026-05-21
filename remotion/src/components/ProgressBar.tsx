import { useCurrentFrame, useVideoConfig } from "remotion";
import { BRAND } from "../data";

export function ProgressBar() {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const progress = Math.min(frame / durationInFrames, 1);

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: 4,
        backgroundColor: "rgba(255, 255, 255, 0.15)",
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          backgroundColor: BRAND.teal,
          borderRadius: "0 2px 2px 0",
          transition: "width 0.05s linear",
        }}
      />
    </div>
  );
}
