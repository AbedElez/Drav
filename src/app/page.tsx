"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { Autocomplete } from "@/components/Autocomplete";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function HomePage() {
  const [q, setQ] = useState("");
  const router = useRouter();
  const {
    suggestions,
    isLoading,
    selectedIndex,
    containerRef,
    fetchSuggestions,
    handleKeyDown,
    selectSuggestion,
    clearSuggestions,
  } = useAutocomplete({ delay: 50, minLength: 1 });

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    clearSuggestions();
    router.push(`/results?q=${encodeURIComponent(q.trim())}`);
  }

  function handleInputChange(value: string) {
    setQ(value);
    fetchSuggestions(value);
  }

  function handleKeyDownWrapper(e: React.KeyboardEvent) {
    // Handle Enter key for search submission
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (q.trim()) {
        clearSuggestions();
        router.push(`/results?q=${encodeURIComponent(q.trim())}`);
      }
      return;
    }
    
    // Handle other keys for autocomplete navigation
    const selectedSuggestion = handleKeyDown(e);
    if (selectedSuggestion) {
      setQ(selectedSuggestion);
      clearSuggestions();
    }
  }

  function handleSuggestionSelect(suggestion: string) {
    setQ(suggestion);
    clearSuggestions();
    // Automatically start the search
    router.push(`/results?q=${encodeURIComponent(suggestion.trim())}`);
  }

  return (
    <main className="min-h-screen bg-white dark:bg-black flex items-center justify-center px-6">
      <div className="w-full max-w-2xl">
        <div className="absolute top-6 right-6">
          <ThemeToggle />
        </div>
        
        <div className="text-center mb-16">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="text-4xl text-black dark:text-white font-medium">
                      ▲▼
                    </div>
                    <div className="text-6xl font-medium tracking-tight text-black dark:text-white">
                      DRAV
                    </div>
                  </div>
          <p className="text-lg text-gray-500 dark:text-gray-400 font-light">
            All intelligence, all at one.
          </p>
        </div>

        <form onSubmit={onSubmit} className="max-w-2xl mx-auto">
          <div className="space-y-4">
            <div ref={containerRef} className="relative group">
              <textarea 
                value={q} 
                onChange={(e) => handleInputChange(e.target.value)} 
                onKeyDown={handleKeyDownWrapper}
                placeholder="Ask anything..." 
                autoFocus
                        className="w-full text-lg px-6 py-4 pr-20 border border-gray-200 dark:border-gray-800 rounded-2xl bg-gray-50/30 dark:bg-gray-900/30 focus:bg-white dark:focus:bg-gray-900 focus:border-gray-300 dark:focus:border-gray-700 focus:ring-0 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white resize-none overflow-y-auto"
                style={{ height: '60px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  const currentHeight = target.offsetHeight;
                  const scrollHeight = target.scrollHeight;
                  const maxHeight = 128;
                  
                  if (scrollHeight > currentHeight && scrollHeight <= maxHeight) {
                    target.style.height = scrollHeight + 'px';
                  } else if (scrollHeight > maxHeight) {
                    target.style.height = maxHeight + 'px';
                  } else if (scrollHeight < currentHeight && scrollHeight > 60) {
                    target.style.height = scrollHeight + 'px';
                  } else if (scrollHeight <= 60) {
                    target.style.height = '60px';
                  }
                }}
              />
                      <div className="absolute right-4 top-0 bottom-0 flex items-center gap-2">
                        <button
                          type="submit"
                          className="text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-lg font-medium select-none transition-colors duration-200 cursor-pointer p-1"
                        >
                          ▲▼
                        </button>
                      </div>
              <Autocomplete
                suggestions={suggestions}
                selectedIndex={selectedIndex}
                onSelect={handleSuggestionSelect}
                onClose={clearSuggestions}
              />
            </div>
                    <div className="flex justify-center gap-3">
                      <Button
                        type="submit"
                        className="h-12 px-8 text-base bg-black dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-200 text-white dark:text-black font-medium rounded-xl transition-all duration-300 hover:scale-[1.02]"
                      >
                        Drav Ask
                      </Button>
                      <Link
                        href="/playground"
                        className="inline-flex items-center justify-center h-12 px-8 text-base border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-white font-medium rounded-xl transition-all duration-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:scale-[1.02]"
                      >
                        Playground
                      </Link>
                    </div>
          </div>
        </form>
      </div>
    </main>
  );
}
