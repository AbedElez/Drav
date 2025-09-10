"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAutocomplete } from "@/hooks/useAutocomplete";
import { Autocomplete } from "@/components/Autocomplete";
import { ThemeToggle } from "@/components/ThemeToggle";

// Truncated content component
function TruncatedContent({ content, maxLength = 400, maxLines = 5 }: { content: string; maxLength?: number; maxLines?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Calculate truncation based on both character count and line count
  const lines = content.split('\n');
  const shouldTruncateByLength = content.length > maxLength;
  const shouldTruncateByLines = lines.length > maxLines;
  const shouldTruncate = shouldTruncateByLength || shouldTruncateByLines;
  
  let displayContent = content;
  if (!isExpanded && shouldTruncate) {
    if (shouldTruncateByLines) {
      // Truncate by lines first
      displayContent = lines.slice(0, maxLines).join('\n') + "...";
    } else {
      // Truncate by character count
      displayContent = content.slice(0, maxLength) + "...";
    }
  }

  return (
    <div>
      <div className="prose prose-sm max-w-none dark:prose-invert prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-medium prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-medium prose-code:text-gray-900 dark:prose-code:text-gray-100 prose-code:bg-gray-100/60 dark:prose-code:bg-gray-800/60 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-50/60 dark:prose-pre:bg-gray-900/60 prose-pre:border prose-pre:border-gray-200/60 dark:prose-pre:border-gray-800/60 prose-pre:rounded-lg prose-ul:list-disc prose-ol:list-decimal prose-li:marker:text-gray-400 dark:prose-li:marker:text-gray-500">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({children}) => <h1 className="text-base font-medium text-gray-900 dark:text-white mb-3">{children}</h1>,
            h2: ({children}) => <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-2">{children}</h2>,
            h3: ({children}) => <h3 className="text-xs font-medium text-gray-900 dark:text-white mb-2">{children}</h3>,
            p: ({children}) => <p className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200 leading-relaxed">{children}</p>,
            ul: ({children}) => <ul className="mb-3 last:mb-0 pl-4 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="mb-3 last:mb-0 pl-4 space-y-1">{children}</ol>,
            li: ({children}) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
            code: ({children}) => <code className="bg-gray-100/60 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
            pre: ({children}) => <pre className="bg-gray-50/60 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 rounded-lg p-3 overflow-x-auto text-xs my-4">{children}</pre>,
            blockquote: ({children}) => <blockquote className="border-l-2 border-gray-200/60 dark:border-gray-800/60 pl-3 italic text-gray-700 dark:text-gray-300 mb-3 bg-gray-50/30 dark:bg-gray-900/30 py-1 rounded-r-lg">{children}</blockquote>,
          }}
        >
          {displayContent}
        </ReactMarkdown>
      </div>
      {shouldTruncate && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}
    </div>
  );
}

type Answer = {
  modelId: string;
  text: string;
  latencyMs: number;
  error?: string;
};

export default function ResultsPage() {
  const sp = useSearchParams();
  const router = useRouter();
  const q = sp.get("q") ?? "";
  const [data, setData] = useState<Answer[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [localQ, setLocalQ] = useState(q);
  const {
    suggestions,
    isLoading: suggestionsLoading,
    selectedIndex,
    containerRef,
    fetchSuggestions,
    handleKeyDown,
    selectSuggestion,
    clearSuggestions,
  } = useAutocomplete({ delay: 50, minLength: 1 });

  useEffect(() => {
    if (!q) return;
    setLoading(true);
    setData(null);
    
    // Use streaming endpoint with fetch
    const responses: Answer[] = [];
    
    fetch("/api/answers/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q }),
    })
    .then(response => {
      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      
      function readStream(): Promise<void> {
        return reader.read().then(({ done, value }) => {
          if (done) {
            setLoading(false);
            return;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === "start") {
                  setData([]);
                } else if (data.type === "response") {
                  setData(prevData => {
                    // Check if we already have a response for this model
                    const existingIndex = prevData?.findIndex(r => r.modelId === data.response.modelId) ?? -1;
                    
                    if (existingIndex >= 0) {
                      // Don't update if we already have a response for this model
                      return prevData;
                    } else {
                      // Add new response
                      return [...(prevData || []), data.response];
                    }
                  });
                } else if (data.type === "complete") {
                  setLoading(false);
                  return;
                }
              } catch (error) {
                console.error("Error parsing SSE data:", error);
              }
            }
          }
          
          return readStream();
        });
      }
      
      return readStream();
    })
    .catch(error => {
      console.error("Streaming error:", error);
      setLoading(false);
    });
  }, [q]);

  function onResubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!localQ.trim()) return;
    clearSuggestions();
    router.push(`/results?q=${encodeURIComponent(localQ.trim())}`);
  }

  function handleInputChange(value: string) {
    setLocalQ(value);
    fetchSuggestions(value);
  }

  function handleKeyDownWrapper(e: React.KeyboardEvent) {
    // Handle Enter key for search submission
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (localQ.trim()) {
        clearSuggestions();
        router.push(`/results?q=${encodeURIComponent(localQ.trim())}`);
      }
      return;
    }
    
    // Handle other keys for autocomplete navigation
    const selectedSuggestion = handleKeyDown(e);
    if (selectedSuggestion) {
      setLocalQ(selectedSuggestion);
      clearSuggestions();
    }
  }

  function handleSuggestionSelect(suggestion: string) {
    setLocalQ(suggestion);
    clearSuggestions();
    // Automatically start the search
    router.push(`/results?q=${encodeURIComponent(suggestion.trim())}`);
  }

  return (
    <div className="min-h-screen bg-white dark:bg-black">
      <header className="border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="mx-auto max-w-7xl px-6 py-5">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 text-xl font-medium text-black dark:text-white cursor-pointer hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-300"
              onClick={() => router.push("/")}
            >
              <span className="text-lg">▲▼</span>
              <span>DRAV</span>
            </div>
            <form onSubmit={onResubmit} className="flex-1 max-w-xl mx-8">
              <div ref={containerRef} className="relative group">
                        <textarea 
                          className="w-full px-4 pr-12 border border-gray-200/60 dark:border-gray-800/60 rounded-xl bg-gray-50/40 dark:bg-gray-900/40 focus:bg-white dark:focus:bg-gray-900 focus:border-gray-300 dark:focus:border-gray-700 focus:ring-0 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white resize-none overflow-y-auto text-sm leading-none"
                          style={{ height: '44px', paddingTop: '14px', paddingBottom: '10px' }}
                  value={localQ} 
                  onChange={(e)=>handleInputChange(e.target.value)} 
                  onKeyDown={handleKeyDownWrapper}
                  placeholder="Ask anything..."
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    const currentHeight = target.offsetHeight;
                    const scrollHeight = target.scrollHeight;
                    const maxHeight = 96;
                    
                    if (scrollHeight > currentHeight && scrollHeight <= maxHeight) {
                      target.style.height = scrollHeight + 'px';
                    } else if (scrollHeight > maxHeight) {
                      target.style.height = maxHeight + 'px';
                    } else if (scrollHeight < currentHeight && scrollHeight > 44) {
                      target.style.height = scrollHeight + 'px';
                    } else if (scrollHeight <= 44) {
                      target.style.height = '44px';
                    }
                  }}
                />
                <button
                  type="submit"
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 text-lg font-medium select-none transition-colors duration-200 cursor-pointer leading-none p-1"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                    />
                  </svg>
                </button>
                <Autocomplete
                  suggestions={suggestions}
                  selectedIndex={selectedIndex}
                  onSelect={handleSuggestionSelect}
                  onClose={clearSuggestions}
                />
              </div>
            </form>
            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="w-16"></div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-12">
        <div className="space-y-8">
          {(() => {
            // Sort models by latency (fastest first) when data is available
            const modelIds = ["gpt-4o", "claude-3-5", "gemini-1.5-pro"];
            
            if (data && data.length > 0) {
              // Create array with model IDs and their latencies
              const modelsWithLatency = modelIds.map(id => {
                const modelData = data.find(d => d.modelId === id);
                return {
                  id,
                  latency: modelData?.latencyMs || Infinity, // Use Infinity for models without data
                  data: modelData
                };
              });
              
              // Sort by latency (fastest first)
              modelsWithLatency.sort((a, b) => a.latency - b.latency);
              
              return modelsWithLatency.map(({ id, data: modelData }) => {
                const isLoading = loading && !modelData;
                
                return (
                  <div key={id} className="group">
                    {isLoading ? (
                      <LoadingSkeleton id={id} />
                    ) : (
                      <ModelRow id={id} data={modelData || null} query={q} />
                    )}
                  </div>
                );
              });
            } else {
              // Show in default order while loading
              return modelIds.map((id) => {
                const modelData = data?.find((d) => d.modelId === id);
                const isLoading = loading && !modelData;
                
                return (
                  <div key={id} className="group">
                    {isLoading ? (
                      <LoadingSkeleton id={id} />
                    ) : (
                      <ModelRow id={id} data={modelData || null} query={q} />
                    )}
                  </div>
                );
              });
            }
          })()}
        </div>
      </main>
    </div>
  );
}

function pretty(id: string) {
  if (id.includes("claude")) return "Claude";
  if (id.includes("gpt")) return "ChatGPT";
  if (id.includes("gemini")) return "Gemini";
  return id;
}

function getModelName(id: string) {
  if (id.includes("claude")) return "Claude 3.5 Sonnet";
  if (id.includes("gpt")) return "GPT-4o";
  if (id.includes("gemini")) return "Gemini 1.5 Pro";
  return id;
}

function LoadingSkeleton({ id }: { id: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 bg-gray-50/20 dark:bg-gray-900/20 group-hover:bg-gray-50/30 dark:group-hover:bg-gray-900/30 transition-colors duration-300 min-h-[200px]">
      <div className="flex items-start gap-6">
        {/* Model Header - Fixed width sidebar */}
        <div className="flex-shrink-0 w-48">
          <div className="mb-4">
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {pretty(id)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 font-light">
              {getModelName(id)}
            </div>
          </div>
          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-1.5 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full animate-pulse"></div>
            <div className="w-1.5 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
            <div className="w-1.5 h-1.5 bg-gray-300/60 dark:bg-gray-600/60 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
          </div>
          <div className="pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <Skeleton className="h-3 w-24 rounded" />
          </div>
        </div>
        
        {/* Content Area - Flexible width */}
        <div className="flex-1 min-w-0">
          <div className="space-y-3">
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-3/4 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-5/6 rounded" />
            <Skeleton className="h-3 w-2/3 rounded" />
            <Skeleton className="h-3 w-full rounded" />
            <Skeleton className="h-3 w-4/5 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ModelRow({ id, data, query }: { id: string; data: Answer | null; query: string }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-2xl p-6 bg-white dark:bg-gray-900 group-hover:border-gray-300 dark:group-hover:border-gray-600 group-hover:shadow-sm dark:group-hover:shadow-lg transition-all duration-300 min-h-[200px]">
      <div className="flex items-start gap-6">
        {/* Model Header - Fixed width sidebar */}
        <div className="flex-shrink-0 w-48">
          <div className="mb-4">
            <div className="text-base font-medium text-gray-900 dark:text-white">
              {pretty(id)}
            </div>
            <div className="text-xs text-gray-400 dark:text-gray-500 font-light">
              {getModelName(id)}
            </div>
          </div>
          {data?.latencyMs && (
            <div className="text-xs text-gray-400 dark:text-gray-500 font-mono mb-4">
              {data.latencyMs}ms
            </div>
          )}
          <div className="pt-4 border-t border-gray-100/60 dark:border-gray-800/60">
            <a
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-md transition-all duration-200 group-hover:gap-2"
              href={deepLink(id, data?.text, query)}
              target="_blank"
              rel="noreferrer"
            >
              Continue in {pretty(id)}
              <span className="transition-transform duration-300 group-hover:translate-x-0.5">→</span>
            </a>
          </div>
        </div>
        
        {/* Content Area - Flexible width */}
        <div className="flex-1 min-w-0">
          <div className="text-sm leading-6 text-gray-900 dark:text-gray-100">
            {data?.error ? (
              <div className="text-red-600 dark:text-red-400 border border-red-100/60 dark:border-red-900/60 bg-red-50/30 dark:bg-red-900/20 rounded-lg p-4">
                <div className="font-medium mb-1 text-sm">Error</div>
                <div className="text-xs">{data.error}</div>
              </div>
            ) : data?.text ? (
              <TruncatedContent content={data.text} />
            ) : (
              <div className="text-gray-400 dark:text-gray-500 italic text-center py-10 text-sm">No response available.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function deepLink(id: string, _text?: string, query?: string) {
  if (!query) return "#";
  
  const encodedQuery = encodeURIComponent(query);
  
  if (id.includes("gpt")) {
    return `https://chat.openai.com/?q=${encodedQuery}`;
  }
  if (id.includes("claude")) {
    return `https://claude.ai/new?q=${encodedQuery}`;
  }
  if (id.includes("gemini")) {
    // Gemini doesn't have a direct query parameter, so use Google search
    return `https://www.google.com/search?q=${encodedQuery}`;
  }
  return "#";
}
