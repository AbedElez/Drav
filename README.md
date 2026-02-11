# Drav

Drav is a multi-model AI search and chat app built with Next.js. It compares answers from OpenAI, Anthropic, and Gemini in real time and displays responses side-by-side.

## Disclaimer

This is a fun toy project for experimentation and learning. It is not production-ready and should not be deployed or used for anything serious, sensitive, or business-critical.

## Quick Start

1. Install dependencies:

```bash
npm install
```

2. Create a local env file from `env.example`:

```bash
cp env.example .env.local
```

3. Add your provider keys to `.env.local`.

4. Start the dev server:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Environment Variables

| Variable | Description | Required |
| --- | --- | --- |
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Gemini API key | Yes |

## Features

- Side-by-side model comparison on `/results`
- Multi-model chat UI on `/chat`
- Streaming model responses via SSE
- Hybrid autocomplete (local + provider-backed suggestions)
- Light/dark/system theme support

## Architecture

```text
src/
  app/
    page.tsx
    results/page.tsx
    chat/page.tsx
    api/
      answers/route.ts
      answers/stream/route.ts
      chat/route.ts
      suggestions/route.ts
  components/
  contexts/
  hooks/
  lib/
    models/
```

## Security Notes

- Never commit secrets or `.env.local`.
- Rotate provider keys immediately if exposed.
- For public deployments, add rate limiting and budget controls for API routes.

## Open Source

- License: `MIT` (see `LICENSE`)

## Deployment

Deploy on Vercel (or any Node-compatible platform), then configure the three provider keys as environment variables in your hosting dashboard.