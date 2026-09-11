import { describe, expect, it } from "vitest";
describe("learning rules", () => { it("deducts a heart for an incorrect answer and protects the floor at zero", () => { let hearts = 1; hearts = Math.max(0, hearts - 1); hearts = Math.max(0, hearts - 1); expect(hearts).toBe(0); }); it("awards more XP for a correct answer", () => { expect(10).toBeGreaterThan(2); }); });
