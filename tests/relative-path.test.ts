import { describe, expect, it } from "vitest";
import { isSafeRelativePath } from "../src/relative-path";

describe("isSafeRelativePath", () => {
  it("accepts workspace-relative file paths", () => {
    expect(isSafeRelativePath("src/server.ts")).toBe(true);
    expect(isSafeRelativePath("notes\\todo.md")).toBe(true);
  });

  it("rejects traversal, absolute, and malformed paths", () => {
    expect(isSafeRelativePath("../secret.txt")).toBe(false);
    expect(isSafeRelativePath("/absolute/path.txt")).toBe(false);
    expect(isSafeRelativePath("https://example.com/file.txt")).toBe(false);
    expect(isSafeRelativePath("folder//file.txt")).toBe(false);
    expect(isSafeRelativePath("folder/")).toBe(false);
    expect(isSafeRelativePath("C:/Windows/system32")).toBe(false);
  });

  it("rejects empty or non-string values", () => {
    expect(isSafeRelativePath("")).toBe(false);
    expect(isSafeRelativePath("   ")).toBe(false);
    expect(isSafeRelativePath(null)).toBe(false);
    expect(isSafeRelativePath(123)).toBe(false);
  });
});
