import { describe, expect, test } from "bun:test";
import { parseYouTubeVideoId } from "../src/utils/youtube";

describe("YouTube URL validation", () => {
  const id = "dQw4w9WgXcQ";
  test("accepts watch, short, embed, shorts, and query parameters", () => {
    for (const url of [
      `https://www.youtube.com/watch?v=${id}`,
      `https://youtu.be/${id}?si=tracking`,
      `https://www.youtube.com/embed/${id}?start=20`,
      `https://youtube.com/shorts/${id}?feature=share`,
    ]) expect(parseYouTubeVideoId(url)).toBe(id);
  });
  test("rejects malformed, non-YouTube, and injection-like values", () => {
    for (const value of ["not a url", "https://evil.example/embed/" + id, `https://youtube.com/watch?v=short`, `<iframe src=\"https://youtube.com/embed/${id}\">`]) expect(parseYouTubeVideoId(value)).toBeNull();
  });
});
