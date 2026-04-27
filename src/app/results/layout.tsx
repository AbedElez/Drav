import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Results",
  description:
    "Side-by-side answers from OpenAI, Anthropic, and Gemini for your query, streamed in real time.",
  alternates: { canonical: "/results" },
  openGraph: {
    title: "Results · Drav",
    description:
      "Side-by-side answers from OpenAI, Anthropic, and Gemini for your query.",
    url: "/results",
  },
  twitter: {
    card: "summary_large_image",
    title: "Results · Drav",
    description:
      "Side-by-side answers from OpenAI, Anthropic, and Gemini for your query.",
  },
};

export default function ResultsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
