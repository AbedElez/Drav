import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Playground",
  description:
    "A node-graph workflow builder for chaining OpenAI, Anthropic, and Gemini models together.",
  alternates: { canonical: "/playground" },
  openGraph: {
    title: "Playground · Drav",
    description:
      "A node-graph workflow builder for chaining OpenAI, Anthropic, and Gemini models together.",
    url: "/playground",
  },
  twitter: {
    card: "summary_large_image",
    title: "Playground · Drav",
    description:
      "A node-graph workflow builder for chaining OpenAI, Anthropic, and Gemini models together.",
  },
};

export default function PlaygroundLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
