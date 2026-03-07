import { describe, it, expect } from "vitest";
import { escposText, escposInit } from "./escpos";

/**
 * Helper: extract the text portion from ESC/POS column output.
 * We re-implement getDisplayWidth and escposColumns logic here
 * to verify alignment with Vietnamese strings.
 */
function getDisplayWidth(str: string): number {
  return [...str.normalize("NFC")].length;
}

function buildColumnString(left: string, right: string, lineWidth: number): string {
  const spaces = Math.max(1, lineWidth - getDisplayWidth(left) - getDisplayWidth(right));
  return left + " ".repeat(spaces) + right;
}

describe("escpos Vietnamese display width", () => {
  it("counts precomposed Vietnamese characters as single width", () => {
    // NFC precomposed: each is 1 code point
    expect(getDisplayWidth("Cơm tấm")).toBe(7);
    expect(getDisplayWidth("Phở bò")).toBe(6);
    expect(getDisplayWidth("Bún chả")).toBe(7);
  });

  it("normalizes NFD combining marks to NFC for correct width", () => {
    // NFD: "ơ" = "o" + combining horn (2 code units), NFC collapses to 1
    const nfdOHorn = "o\u031B"; // "ơ" in NFD
    expect(nfdOHorn.length).toBe(2); // String.length overcounts
    expect(getDisplayWidth(nfdOHorn)).toBe(1); // display width correct
  });

  it("aligns two-column Vietnamese text correctly", () => {
    const line = buildColumnString("Cơm tấm sườn", "45.000đ", 32);
    // "Cơm tấm sườn" = 12 chars, "45.000đ" = 7 chars, 32 - 12 - 7 = 13 spaces
    expect(getDisplayWidth("Cơm tấm sườn")).toBe(12);
    expect(getDisplayWidth("45.000đ")).toBe(7);
    expect(line).toBe("Cơm tấm sườn" + " ".repeat(13) + "45.000đ");
  });

  it("handles mixed ASCII and Vietnamese in columns", () => {
    const line = buildColumnString("Ma HD:", "DH-001", 32);
    expect(line).toBe("Ma HD:" + " ".repeat(20) + "DH-001");
  });

  it("guarantees at least 1 space between columns even when text overflows", () => {
    const longLeft = "A".repeat(30);
    const longRight = "B".repeat(10);
    const line = buildColumnString(longLeft, longRight, 32);
    // 30 + 10 = 40 > 32, so Math.max(1, ...) gives 1 space
    expect(line).toBe(longLeft + " " + longRight);
  });
});

describe("escposText NFC normalization", () => {
  it("normalizes NFD to NFC before encoding", () => {
    // "ơ" in NFD = o + combining horn
    const nfd = "C\u01A1m"; // "Cơm" with precomposed ơ
    const nfdDecomposed = "Co\u031Bm"; // "Cơm" with decomposed o + combining horn
    const encoded1 = escposText(nfd);
    const encoded2 = escposText(nfdDecomposed);
    // Both should produce identical UTF-8 bytes after NFC normalization
    expect(Array.from(encoded1)).toEqual(Array.from(encoded2));
  });
});

describe("escposInit", () => {
  it("includes ESC @ reset and UTF-8 charset command", () => {
    const init = escposInit();
    // ESC @ = 0x1B 0x40
    expect(init[0]).toBe(0x1b);
    expect(init[1]).toBe(0x40);
    // FS C command for UTF-8 should follow
    expect(init[2]).toBe(0x1c); // FS
    expect(init[3]).toBe(0x43); // C
  });
});
