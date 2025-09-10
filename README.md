# Drav v0.1

A minimal search page that compares answers from OpenAI (GPT-4o), Anthropic (Claude 3.5), and Google Gemini (1.5 Pro).

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local` file with your API keys:
```
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key_here
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Features

- **Search Page (/)**: Minimal Google-like interface with centered logo and search input
- **Results Page (/results)**: Horizontal comparison of answers from all three AI models
- **Real-time Comparison**: Side-by-side view of responses with latency metrics
- **Error Handling**: Graceful error handling for individual model failures
- **Clean UI**: Ultra-minimal design matching Google's simplicity

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- TailwindCSS + shadcn/ui
- OpenAI API
- Anthropic API
- Google Gemini API
- Zod for validation

## Deployment

Deploy to Vercel and add the three API keys as environment variables in your Vercel dashboard.
