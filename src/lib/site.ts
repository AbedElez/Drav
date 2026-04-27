export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const SITE_NAME = "Drav";

export const SITE_DESCRIPTION =
  "Talk to multiple AI at once with Drav. Compare answers from OpenAI, Anthropic, and Google Gemini side-by-side, or chain models together in a visual workflow builder.";

export const SITE_TAGLINE = "Talk to multiple AI at once.";
