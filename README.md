# Drav™

Drav™ is a multi-model AI search app built with Next.js. It compares answers from OpenAI, Anthropic, and Gemini in real time and displays responses side-by-side.

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
| `OPENAI_MODEL` | OpenAI model for answers (default: `gpt-4.1`) | No |
| `ANTHROPIC_MODEL` | Anthropic model for answers (default: `claude-3-7-sonnet-latest`) | No |
| `GEMINI_MODEL` | Gemini model for answers (default: `gemini-2.5-flash`) | No |
| `OPENAI_SUGGESTIONS_MODEL` | OpenAI model for autocomplete (default: `gpt-4.1-mini`) | No |
| `GEMINI_SUGGESTIONS_MODEL` | Gemini model for autocomplete (default: `gemini-2.5-flash`) | No |

## Features

- Side-by-side model comparison on `/results`
- Streaming model responses via SSE
- Hybrid autocomplete (local + provider-backed suggestions)
- Node-graph workflow builder on `/playground`
- Light/dark/system theme support

## Playground

The Playground (`/playground`) is a node-graph builder for chaining models together. You drag and connect three kinds of nodes on a canvas:

- **Input** — a starting text box.
- **Model** — picks a provider (OpenAI / Anthropic / Gemini) and runs a prompt.
- **Output** — terminal display of a final result.

Connect node outputs to downstream node inputs to form a directed acyclic graph. Click **Run** and the server topologically sorts the graph and executes nodes in dependency order, running independent branches in parallel and streaming each model's tokens back into its node in real time.

### Prompt placeholders

Inside a Model node's prompt, two placeholders are substituted with upstream node outputs:

- `{{input}}` — concatenation of all upstream node outputs (separated by blank lines). Best for the common single-input case.
- `{{input_1}}`, `{{input_2}}`, … — the Nth upstream output, ordered by the order edges were connected. Use these when a Model node has multiple incoming edges and the prompt needs to refer to each one separately.

Each Model node shows the placeholders available to it based on its current incoming edges.

### Notes and limits

- Workflows are **ephemeral** — there is no save/load. A page reload starts from the default seed graph.
- Graphs must be acyclic. Cycles are rejected by the server.
- Per-run limits: up to 20 nodes and 60 edges, 30s per Model node, 10 runs per minute per IP.
- Deferred to a future version: conditional branches, loops, named handles, undo/redo, and persistence.

## Architecture

```text
src/
  app/
    page.tsx
    results/page.tsx
    playground/
      page.tsx
      nodes/
    api/
      answers/route.ts
      answers/stream/route.ts
      playground/graph/route.ts
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