import { describe, expect, it } from "vitest";
import { feedbackMailto } from "@/components/dashboard/feedback-dialog";
import { PROJECT_ISSUES_URL } from "@/lib/constants/site";

describe("geri bildirim", () => {
  it("sunucuya gitmez; adres yokken GitHub'da açılır, metin kodlanır", () => {
    const url = feedbackMailto("Merhaba & selam?");
    expect(url.startsWith(`${PROJECT_ISSUES_URL}/new?`)).toBe(true);
    expect(url).toContain("body=Merhaba%20%26%20selam%3F");
  });
});
