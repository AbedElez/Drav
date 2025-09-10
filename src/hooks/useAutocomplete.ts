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

export function useAutocomplete(options: UseAutocompleteOptions = {}) {
  const { delay = 100, minLength = 1 } = options;
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  const getLocalSuggestions = useCallback((query: string): string[] => {
    const words = query.toLowerCase().split(' ');
    const firstWord = words[0];
    
    if (COMMON_SUGGESTIONS[firstWord]) {
      return COMMON_SUGGESTIONS[firstWord]
        .map(suggestion => `${firstWord} ${suggestion}`)
        .filter(s => s.toLowerCase().startsWith(query.toLowerCase()))
        .slice(0, 5);
    }
    
    // Fallback: generate simple suggestions based on common patterns
    const commonEndings = ['is', 'are', 'does', 'was', 'will', 'did', 'can', 'should', 'would'];
    return commonEndings
      .map(ending => `${query} ${ending}`)
      .filter(s => s.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 3);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < minLength) {
      setSuggestions([]);
      return;
    }

    // Check cache first
    if (suggestionCache.has(query)) {
      setSuggestions(suggestionCache.get(query)!);
      return;
    }

    // Get local suggestions immediately for instant feedback
    const localSuggestions = getLocalSuggestions(query);
    if (localSuggestions.length > 0) {
      setSuggestions(localSuggestions);
    }

    // Always make API call for intelligent suggestions (2+ chars)
    if (query.length >= 2) {
      setIsLoading(true);
      try {
        const response = await fetch('/api/suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query }),
        });
        const data = await response.json();
        const apiSuggestions = data.suggestions || [];
        
        // Cache the results
        suggestionCache.set(query, apiSuggestions);
        
        // Combine local and API suggestions, prioritizing API suggestions
        const combined = Array.from(new Set([...apiSuggestions, ...localSuggestions])).slice(0, 5);
        setSuggestions(combined);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error fetching suggestions:', error);
        // Keep local suggestions if API fails
      } finally {
        setIsLoading(false);
      }
    }
  }, [minLength, getLocalSuggestions]);

  const debouncedFetch = useCallback(
    (() => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fetchSuggestions(query), delay);
      };
    })(),
    [fetchSuggestions, delay]
  );

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
