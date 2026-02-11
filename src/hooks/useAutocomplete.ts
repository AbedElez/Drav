import { useState, useEffect, useCallback, useRef } from 'react';

interface UseAutocompleteOptions {
  delay?: number;
  minLength?: number;
}

// Pre-defined suggestions for common queries
const COMMON_SUGGESTIONS: Record<string, string[]> = {
  'how': ['how to', 'how does', 'how much', 'how many', 'how long', 'how often'],
  'what': ['what is', 'what are', 'what does', 'what time', 'what day', 'what year'],
  'when': ['when is', 'when does', 'when was', 'when will', 'when did', 'when do'],
  'where': ['where is', 'where are', 'where does', 'where was', 'where will', 'where did'],
  'why': ['why is', 'why are', 'why does', 'why was', 'why will', 'why did'],
  'who': ['who is', 'who are', 'who does', 'who was', 'who will', 'who did'],
  'which': ['which is', 'which are', 'which does', 'which was', 'which will', 'which did'],
  'can': ['can i', 'can you', 'can we', 'can it', 'can they', 'can this'],
  'should': ['should i', 'should you', 'should we', 'should it', 'should they', 'should this'],
  'will': ['will i', 'will you', 'will we', 'will it', 'will they', 'will this'],
  'best': ['best way', 'best time', 'best place', 'best method', 'best option', 'best choice'],
  'difference': ['difference between', 'difference in', 'difference of', 'difference from', 'difference to'],
  'compare': ['compare to', 'compare with', 'compare vs', 'compare and', 'compare between'],
  'explain': ['explain how', 'explain why', 'explain what', 'explain when', 'explain where'],
  'learn': ['learn how', 'learn about', 'learn to', 'learn from', 'learn with'],
  'find': ['find out', 'find the', 'find a', 'find my', 'find best'],
  'get': ['get started', 'get help', 'get better', 'get more', 'get the'],
  'make': ['make a', 'make the', 'make it', 'make sure', 'make better'],
  'use': ['use for', 'use to', 'use with', 'use in', 'use this'],
  'work': ['work on', 'work with', 'work for', 'work in', 'work at'],
};

// Cache for API suggestions
const suggestionCache = new Map<string, string[]>();

function normalizeQuery(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function dedupeSuggestions(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

function sanitizeSuggestion(query: string, suggestion: string): string {
  const normalizedQuery = normalizeQuery(query).toLowerCase();
  let value = normalizeQuery(suggestion);

  // Collapse duplicated leading term patterns like "who who is" -> "who is".
  value = value.replace(/^([a-zA-Z]+)\s+\1\b/i, "$1");

  // If suggestion starts with duplicated full query phrase, collapse it.
  if (normalizedQuery) {
    const dupPrefix = `${normalizedQuery} ${normalizedQuery} `;
    const lower = value.toLowerCase();
    if (lower.startsWith(dupPrefix)) {
      value = `${normalizedQuery} ${value.slice(dupPrefix.length)}`.trim();
    }
  }

  return value;
}

function cleanSuggestions(query: string, items: string[]): string[] {
  const normalizedQuery = normalizeQuery(query).toLowerCase();
  return dedupeSuggestions(
    items
      .map((item) => sanitizeSuggestion(normalizedQuery, item))
      .filter((item) => item.length > 0)
      // Drop suggestions that are equal to or shorter than the query itself.
      .filter((item) => item.toLowerCase().length > normalizedQuery.length)
  );
}

export function useAutocomplete(options: UseAutocompleteOptions = {}) {
  const { delay = 100, minLength = 1 } = options;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestQueryRef = useRef("");
  const requestIdRef = useRef(0);

  const getLocalSuggestions = useCallback((query: string): string[] => {
    const normalized = normalizeQuery(query).toLowerCase();
    if (!normalized) return [];

    const words = normalized.split(" ");
    const firstWord = words[0];

    if (COMMON_SUGGESTIONS[firstWord]) {
      return cleanSuggestions(normalized, COMMON_SUGGESTIONS[firstWord]
        .filter((suggestion) => suggestion.toLowerCase().startsWith(normalized))
        .slice(0, 5));
    }

    // Support partial first-word typing like "ho" -> "how to", "how does", etc.
    if (words.length === 1) {
      const matchingFamilies = Object.entries(COMMON_SUGGESTIONS)
        .filter(([key]) => key.startsWith(firstWord))
        .flatMap(([, family]) => family);
      const familyMatches = cleanSuggestions(normalized, dedupeSuggestions(matchingFamilies)
        .filter((suggestion) => suggestion.toLowerCase().startsWith(normalized))
        .slice(0, 5));
      if (familyMatches.length > 0) {
        return familyMatches;
      }
    }

    // Fallback: generate simple suggestions based on common patterns
    const commonEndings = ['is', 'are', 'does', 'was', 'will', 'did', 'can', 'should', 'would'];
    if (normalized.length < 3) {
      return [];
    }

    return cleanSuggestions(normalized, dedupeSuggestions(
      commonEndings
        .map((ending) => `${normalized} ${ending}`)
        .filter((suggestion) => suggestion.toLowerCase().startsWith(normalized))
    )).slice(0, 3);
  }, []);

  const fetchSuggestions = useCallback(async (query: string, requestId: number) => {
    const normalized = normalizeQuery(query);
    const cacheKey = normalized.toLowerCase();

    if (normalized.length < minLength) {
      if (requestId !== requestIdRef.current) return;
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    // Check cache first
    if (suggestionCache.has(cacheKey)) {
      if (requestId !== requestIdRef.current) return;
      setSuggestions(cleanSuggestions(normalized, suggestionCache.get(cacheKey)!));
      setSelectedIndex(-1);
      return;
    }

    // Get local suggestions immediately for instant feedback
    const localSuggestions = getLocalSuggestions(normalized);
    if (requestId === requestIdRef.current) {
      setSuggestions(localSuggestions);
      setSelectedIndex(-1);
    }

    // Only call API once enough context exists; this avoids noisy/random short-query suggestions.
    if (normalized.length < 4) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: normalized }),
      });
      const data = await response.json();
      const apiSuggestions = cleanSuggestions(normalized, data.suggestions || []);

      // Cache results by normalized key
      suggestionCache.set(cacheKey, apiSuggestions);

      if (requestId !== requestIdRef.current || latestQueryRef.current !== normalized) {
        return;
      }

      // Combine local and API suggestions, prioritizing API suggestions
      const combined = cleanSuggestions(normalized, [...apiSuggestions, ...localSuggestions]).slice(0, 5);
      setSuggestions(combined);
      setSelectedIndex(-1);
    } catch (error) {
      if (requestId !== requestIdRef.current) return;
      console.error('Error fetching suggestions:', error);
      // Keep local suggestions if API fails
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [minLength, getLocalSuggestions]);

  const debouncedFetch = useCallback((query: string) => {
    const normalized = normalizeQuery(query);
    latestQueryRef.current = normalized;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(normalized, requestId);
    }, delay);
  }, [fetchSuggestions, delay]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          e.preventDefault();
          return suggestions[selectedIndex];
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
    return null;
  }, [suggestions, selectedIndex]);

  const selectSuggestion = useCallback((suggestion: string) => {
    setSuggestions([]);
    setSelectedIndex(-1);
    return suggestion;
  }, []);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setSelectedIndex(-1);
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        clearSuggestions();
      }
    }

    if (suggestions.length > 0) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [suggestions.length, clearSuggestions]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    selectedIndex,
    containerRef,
    fetchSuggestions: debouncedFetch,
    handleKeyDown,
    selectSuggestion,
    clearSuggestions,
  };
}
