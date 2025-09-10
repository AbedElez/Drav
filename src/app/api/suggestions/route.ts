import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const runtime = "nodejs";

const Body = z.object({ query: z.string().min(1).max(100) });

// Cache for API responses
const responseCache = new Map<string, { suggestions: string[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Simple suggestion patterns for common queries (fallback)
const SUGGESTION_PATTERNS: Record<string, string[]> = {
  'weather': ['weather today', 'weather forecast', 'weather app', 'weather channel', 'weather radar'],
  'news': ['news today', 'breaking news', 'latest news', 'news headlines', 'news update'],
  'recipe': ['recipe for', 'easy recipe', 'healthy recipe', 'quick recipe', 'dinner recipe'],
  'movie': ['movie reviews', 'new movies', 'movie trailers', 'movie times', 'best movies'],
  'music': ['music streaming', 'new music', 'music videos', 'music download', 'music player'],
  'travel': ['travel deals', 'travel guide', 'travel tips', 'travel booking', 'travel insurance'],
  'shopping': ['online shopping', 'shopping deals', 'shopping mall', 'shopping list', 'shopping app'],
  'health': ['health tips', 'health news', 'health insurance', 'health check', 'health app'],
  'technology': ['tech news', 'new technology', 'tech reviews', 'tech gadgets', 'tech trends'],
  'sports': ['sports news', 'sports scores', 'sports betting', 'sports highlights', 'sports schedule'],
  'education': ['online learning', 'education courses', 'study tips', 'education news', 'learning resources'],
  'finance': ['finance news', 'investment tips', 'financial planning', 'stock market', 'personal finance'],
  'food': ['food delivery', 'restaurant reviews', 'food recipes', 'food near me', 'food trends'],
  'fitness': ['fitness tips', 'workout plans', 'fitness tracker', 'gym membership', 'fitness app'],
  'gaming': ['gaming news', 'new games', 'gaming reviews', 'gaming setup', 'gaming deals'],
  'books': ['book reviews', 'new books', 'book recommendations', 'ebooks', 'audiobooks'],
  'art': ['art gallery', 'art museum', 'art supplies', 'art tutorials', 'art history'],
  'science': ['science news', 'scientific research', 'science experiments', 'science facts', 'science education'],
  'history': ['history facts', 'historical events', 'history books', 'history museum', 'history timeline'],
  'language': ['language learning', 'language translation', 'language courses', 'language app', 'language exchange'],
};

async function getAISuggestions(query: string): Promise<string[]> {
  // Try OpenAI first (fastest), then Gemini as fallback
  const openaiKey = process.env.OPENAI_API_KEY;
  const geminiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  // Try OpenAI GPT-3.5-turbo first (fastest)
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{
            role: 'user',
            content: `Suggest 3 popular search queries related to: "${query}". Return only the queries, one per line, without numbering. Keep them short and relevant.`
          }],
          max_tokens: 50,
          temperature: 0.1,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || '';
        
        const suggestions = text
          .split('\n')
          .map(s => s.trim())
          .filter(s => s.length > 0)
          .map(s => {
            s = s.replace(/^\d+\.\s*/, ''); // Remove numbering
            s = s.replace(/^["']|["']$/g, ''); // Remove quotes
            s = s.replace(/^[-•]\s*/, ''); // Remove bullet points
            return s.trim();
          })
          .filter(s => s.length > 0 && s.length < 50)
          .slice(0, 3);

        if (suggestions.length > 0) {
          return suggestions;
        }
      }
    } catch (error) {
      console.log("OpenAI suggestions failed, trying Gemini");
    }
  }

  // Fallback to Gemini
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(geminiKey);
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        generationConfig: {
          maxOutputTokens: 50,
          temperature: 0.1,
        }
      });

      const prompt = `Suggest 3 popular search queries related to: "${query}"

Return only the queries, one per line, without numbering. Keep them short and relevant.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      const suggestions = text
        ?.split('\n')
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => {
          s = s.replace(/^\d+\.\s*/, '');
          s = s.replace(/^["']|["']$/g, '');
          s = s.replace(/^[-•]\s*/, '');
          return s.trim();
        })
        .filter(s => s.length > 0 && s.length < 50)
        .slice(0, 3) || [];

      return suggestions;
    } catch (error) {
      console.error("Gemini suggestions error:", error);
    }
  }

  return [];
}

function getFallbackSuggestions(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  
  // Check for exact matches first
  for (const [key, suggestions] of Object.entries(SUGGESTION_PATTERNS)) {
    if (lowerQuery.includes(key)) {
      return suggestions.slice(0, 3);
    }
  }

  // Generate simple suggestions based on query patterns
  const suggestions: string[] = [];

  // Add variations with common words
  const commonWords = ['best', 'how to', 'what is', 'where to', 'when to', 'why', 'tips', 'guide', 'review'];
  
  for (const word of commonWords) {
    if (!lowerQuery.includes(word)) {
      suggestions.push(`${word} ${query}`);
    }
  }

  // Add related terms
  const relatedTerms = ['2024', '2025', 'latest', 'new', 'free', 'online', 'app', 'website'];
  for (const term of relatedTerms) {
    if (!lowerQuery.includes(term)) {
      suggestions.push(`${query} ${term}`);
    }
  }

  // Add question variations
  if (!lowerQuery.startsWith('what') && !lowerQuery.startsWith('how') && !lowerQuery.startsWith('why')) {
    suggestions.push(`what is ${query}`);
    suggestions.push(`how to ${query}`);
  }

  return suggestions
    .filter(s => s.length > query.length)
    .slice(0, 3);
}

export async function POST(req: NextRequest) {
  try {
    const json = await req.json();
    const { query } = Body.parse(json);

    // Check cache first
    const cached = responseCache.get(query);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return NextResponse.json({ suggestions: cached.suggestions });
    }

    // Try AI suggestions first (with timeout)
    const aiPromise = getAISuggestions(query);
    const timeoutPromise = new Promise<string[]>((_, reject) => 
      setTimeout(() => reject(new Error('Timeout')), 2000) // 2 second timeout
    );

    let suggestions: string[] = [];
    
    try {
      suggestions = await Promise.race([aiPromise, timeoutPromise]);
    } catch (error) {
      console.log("AI suggestions failed or timed out, using fallback");
      suggestions = getFallbackSuggestions(query);
    }

    // If AI suggestions are empty or too few, supplement with fallback
    if (suggestions.length < 3) {
      const fallbackSuggestions = getFallbackSuggestions(query);
      suggestions = [...new Set([...suggestions, ...fallbackSuggestions])].slice(0, 3);
    }

    // Cache the results
    responseCache.set(query, { suggestions, timestamp: Date.now() });

    return NextResponse.json({ suggestions });
  } catch (e: any) {
    console.error("Suggestions error:", e);
    return NextResponse.json({ suggestions: getFallbackSuggestions('') });
  }
}
