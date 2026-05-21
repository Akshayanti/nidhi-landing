import { describe, it } from "node:test";
import assert from "node:assert";
import { parseVtt, getDurationSec } from "./parse-vtt.mjs";

describe("parseVtt", () => {
  it("parses phrase-level VTT and distributes word timings", () => {
    const vtt = `WEBVTT

1
00:00:00,100 --> 00:00:02,750
Financial risk isn't danger.

2
00:00:02,700 --> 00:00:05,362
It's uncertainty about the future.
`;

    const result = parseVtt(vtt);
    assert.ok(result.length >= 6, `Expected >=6 words, got ${result.length}`);
    assert.strictEqual(result[0].word, "Financial");
    assert.ok(result[0].startMs < result[0].endMs);

    // Check the first phrase's words are within the phrase's time range
    const firstPhraseWords = result.filter(
      w => ["Financial", "risk", "isn't", "danger."].includes(w.word)
    );
    assert.strictEqual(firstPhraseWords.length, 4);

    // Check last word has reasonable timing
    const last = result[result.length - 1];
    assert.ok(last.endMs > 0);
  });

  it("handles empty VTT", () => {
    const vtt = "WEBVTT\n";
    const result = parseVtt(vtt);
    assert.strictEqual(result.length, 0);
  });

  it("skips cue numbers", () => {
    const vtt = `WEBVTT

1
00:00:00,000 --> 00:00:00,500
Hello

`;
    const result = parseVtt(vtt);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].word, "Hello");
  });

  it("skips NOTE lines", () => {
    const vtt = `WEBVTT

NOTE This is a comment

1
00:00:00,000 --> 00:00:00,500
Hello

`;
    const result = parseVtt(vtt);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].word, "Hello");
  });

  it("handles period-format timestamps too", () => {
    const vtt = `WEBVTT

1
00:00:00.000 --> 00:00:00.500
Hi

`;
    const result = parseVtt(vtt);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].word, "Hi");
  });

  it("handles multi-word phrases with even distribution", () => {
    const vtt = `WEBVTT

1
00:00:00,000 --> 00:00:04,000
one two three four
`;

    const result = parseVtt(vtt);
    assert.strictEqual(result.length, 4);
    assert.strictEqual(result[0].startMs, 0);
    assert.strictEqual(result[0].endMs, 1000);
    assert.strictEqual(result[1].startMs, 1000);
    assert.strictEqual(result[1].endMs, 2000);
    assert.strictEqual(result[3].endMs, 4000);
  });
});

describe("getDurationSec", () => {
  it("returns duration in seconds", () => {
    const timings = [
      { word: "a", startMs: 0, endMs: 500 },
      { word: "b", startMs: 500, endMs: 2500 },
    ];
    assert.strictEqual(getDurationSec(timings), 2.5);
  });

  it("returns 30 for empty array", () => {
    assert.strictEqual(getDurationSec([]), 30);
  });
});
