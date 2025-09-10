# Drav v0.1

A minimal AI search engine that compares answers from OpenAI (GPT-4o), Anthropic (Claude 3.5), and Google Gemini (1.5 Pro) in real-time. Features intelligent autocomplete, multi-model chat, and a clean Google-inspired interface.

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

### 🔍 **Search Interface**
- **Home Page (/)**: Ultra-minimal Google-like interface with auto-focused search box
- **Results Page (/results)**: Horizontal comparison of AI model responses with dynamic ordering by speed
- **Intelligent Autocomplete**: Hybrid AI-powered suggestions using GPT-3.5-turbo and Gemini 1.5 Flash
- **Real-time Streaming**: Responses stream as soon as each model responds
- **Markdown Rendering**: Rich text formatting in AI responses
- **Deep Linking**: "Continue in MODEL" buttons for seamless model-specific conversations

### 💬 **Multi-Model Chat**
- **Chat Page (/chat)**: Horizontal multi-model chat interface
- **Sticky Header**: Persistent search bar with input transfer from home page
- **Content Truncation**: Smart truncation for long responses with expand/collapse
- **Conversation Grouping**: User messages grouped with AI responses

### 🎨 **User Experience**
- **Light/Dark Mode**: Automatic detection with manual toggle
- **Responsive Design**: Works seamlessly across all device sizes
- **Auto-resizing Inputs**: Dynamic height adjustment with scroll support for long queries
- **Loading States**: Skeleton loaders and real-time progress indicators
- **Error Handling**: Graceful fallbacks for individual model failures

### ⚡ **Performance**
- **Concurrent API Calls**: All models queried simultaneously using Promise.allSettled
- **Client-side Caching**: Autocomplete suggestions cached for instant responses
- **Server-side Caching**: API responses cached to reduce latency
- **Streaming Responses**: Real-time updates as models respond

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: TailwindCSS + shadcn/ui components
- **AI Models**: 
  - OpenAI GPT-4o
  - Anthropic Claude 3.5 Sonnet
  - Google Gemini 1.5 Pro
- **Autocomplete**: Hybrid local + AI-powered suggestions
- **Markdown**: react-markdown with GitHub Flavored Markdown
- **Validation**: Zod for request/response validation
- **Icons**: Custom SVG favicon and UI icons

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Home search page
│   ├── results/page.tsx      # Search results comparison
│   ├── chat/page.tsx         # Multi-model chat interface
│   └── api/
│       ├── search/route.ts   # Search API with streaming
│       ├── chat/route.ts     # Chat API with streaming
│       └── suggestions/route.ts # Autocomplete API
├── components/
│   ├── TruncatedContent.tsx  # Content truncation component
│   └── ThemeToggle.tsx       # Dark/light mode toggle
├── hooks/
│   └── useAutocomplete.ts    # Autocomplete logic
├── lib/
│   ├── models/               # AI model integrations
│   └── utils.ts              # Utility functions
└── contexts/
    └── ThemeContext.tsx      # Theme management
```

## Deployment

Deploy to Vercel and add the three API keys as environment variables in your Vercel dashboard. The app is fully stateless and requires no database.

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4o | Yes |
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude 3.5 | Yes |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Google API key for Gemini 1.5 Pro | Yes |