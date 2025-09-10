"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThemeToggle } from "@/components/ThemeToggle";

// Truncated content component
function TruncatedContent({ content, maxLength = 200, maxLines = 5 }: { content: string; maxLength?: number; maxLines?: number }) {
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
      <div className="prose prose-sm max-w-none dark:prose-invert">
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({children}) => <p className="mb-3 last:mb-0 text-gray-800 dark:text-gray-200 leading-relaxed">{children}</p>,
            ul: ({children}) => <ul className="mb-3 last:mb-0 pl-4 space-y-1">{children}</ul>,
            ol: ({children}) => <ol className="mb-3 last:mb-0 pl-4 space-y-1">{children}</ol>,
            li: ({children}) => <li className="text-gray-800 dark:text-gray-200">{children}</li>,
            code: ({children}) => <code className="bg-gray-100/60 dark:bg-gray-800/60 text-gray-900 dark:text-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
            pre: ({children}) => <pre className="bg-gray-50/60 dark:bg-gray-900/60 border border-gray-200/60 dark:border-gray-800/60 rounded-lg p-3 overflow-x-auto text-xs my-4">{children}</pre>,
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

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  modelId?: string;
  latencyMs?: number;
  error?: string;
};

type ChatResponse = {
  modelId: string;
  text: string;
  latencyMs: number;
  error?: string;
};

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentResponses, setCurrentResponses] = useState<ChatResponse[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const responsesRef = useRef<ChatResponse[]>([]);

  // Pre-fill input with query parameter
  useEffect(() => {
    const query = searchParams.get("q");
    if (query) {
      setInput(query);
    }
  }, [searchParams]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentResponses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    setCurrentResponses([]);
    responsesRef.current = [];

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: input.trim() }),
      });

      if (!response.ok) throw new Error('Network response was not ok');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');
      
      const decoder = new TextDecoder();
      
      const readStream = (): Promise<void> => {
        return reader.read().then(({ done, value }) => {
        if (done) {
          setIsLoading(false);
          // Add all responses as separate messages
          const assistantMessages = responsesRef.current.map(response => ({
            id: `${Date.now()}-${response.modelId}`,
            role: 'assistant' as const,
            content: response.text || response.error || "No response",
            timestamp: new Date(),
            modelId: response.modelId,
            latencyMs: response.latencyMs,
            error: response.error
          }));
          setMessages(prev => [...prev, ...assistantMessages]);
          setCurrentResponses([]);
          responsesRef.current = [];
          return;
        }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === "start") {
                  // Do nothing, just started
                } else if (data.type === "response") {
                  console.log("Received response:", data.response);
                  
                  // Check if we already have a response from this model for the current user message
                  setMessages(prev => {
                    const lastUserMessage = [...prev].reverse().find(msg => msg.role === 'user');
                    if (!lastUserMessage) return prev;
                    
                    // Check if we already have a response from this model after the last user message
                    const hasResponseFromModel = prev
                      .slice(prev.findIndex(msg => msg.id === lastUserMessage.id))
                      .some(msg => msg.role === 'assistant' && msg.modelId === data.response.modelId);
                    
                    if (hasResponseFromModel) {
                      return prev; // Don't add duplicate
                    }
                    
                    // Add the message immediately for real-time display
                    const assistantMessage = {
                      id: `${Date.now()}-${data.response.modelId}`,
                      role: 'assistant' as const,
                      content: data.response.text || data.response.error || "No response",
                      timestamp: new Date(),
                      modelId: data.response.modelId,
                      latencyMs: data.response.latencyMs,
                      error: data.response.error
                    };
                    
                    return [...prev, assistantMessage];
                  });
                  
                  // Update currentResponses for loading indicators
                  setCurrentResponses(prev => {
                    const existingIndex = prev.findIndex(r => r.modelId === data.response.modelId);
                    if (existingIndex >= 0) {
                      return prev; // Don't update existing responses
                    } else {
                      const newResponses = [...prev, data.response];
                      responsesRef.current = newResponses;
                      return newResponses;
                    }
                  });
                } else if (data.type === "complete") {
                  setIsLoading(false);
                  setCurrentResponses([]);
                  responsesRef.current = [];
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
    } catch (error) {
      console.error("Chat error:", error);
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const getModelName = (modelId: string) => {
    if (modelId.includes("claude")) return "Claude 3.5 Sonnet";
    if (modelId.includes("gpt")) return "GPT-4o";
    if (modelId.includes("gemini")) return "Gemini 1.5 Pro";
    return modelId;
  };

  const getModelShortName = (modelId: string) => {
    if (modelId.includes("claude")) return "Claude";
    if (modelId.includes("gpt")) return "ChatGPT";
    if (modelId.includes("gemini")) return "Gemini";
    return modelId;
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-black border-b border-gray-100/50 dark:border-gray-800/50">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 text-xl font-medium text-black dark:text-white cursor-pointer hover:text-gray-500 dark:hover:text-gray-400 transition-colors duration-300"
              onClick={() => router.push("/")}
            >
              <span className="text-lg">▲▼</span>
              <span>DRAV</span>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="px-4 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Search
              </Button>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 text-black dark:text-white">▲▼</div>
              <h1 className="text-2xl font-medium text-gray-900 dark:text-white mb-2">
                Drav Chat
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Chat with all AI models simultaneously
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {(() => {
                // Group messages by conversation turns
                const conversationTurns: { user: Message | null; assistants: Message[] }[] = [];
                let currentTurn: { user: Message | null; assistants: Message[] } = { user: null, assistants: [] };
                
                messages.forEach((message) => {
                  if (message.role === 'user') {
                    if (currentTurn.user || currentTurn.assistants.length > 0) {
                      conversationTurns.push(currentTurn);
                      currentTurn = { user: message, assistants: [] };
                    } else {
                      currentTurn.user = message;
                    }
                  } else {
                    currentTurn.assistants.push(message);
                  }
                });
                
                if (currentTurn.user || currentTurn.assistants.length > 0) {
                  conversationTurns.push(currentTurn);
                }
                
                return conversationTurns.map((turn, turnIndex) => (
                  <div key={turnIndex} className="space-y-4">
                    {/* User message */}
                    {turn.user && (
                      <div className="flex justify-end">
                        <div className="max-w-3xl">
                          <div className="bg-blue-500 text-white px-4 py-3 rounded-2xl rounded-br-md">
                            {turn.user.content}
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* AI responses - horizontal layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      {["claude-3-5", "gpt-4o", "gemini-1.5-pro"].map((modelId) => {
                        const modelMessage = turn.assistants.find(m => m.modelId === modelId);
                        const isWaiting = isLoading && !modelMessage;
                        
                        return (
                          <Card key={modelId} className="p-4 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                            <div className="flex items-center gap-2 mb-3">
                              <div className={`w-2 h-2 rounded-full ${isWaiting ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                              <div className="flex flex-col">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {getModelShortName(modelId)}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {getModelName(modelId)}
                                </span>
                              </div>
                              {modelMessage?.latencyMs && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono ml-auto">
                                  {modelMessage.latencyMs}ms
                                </span>
                              )}
                            </div>
                            <div className="prose prose-sm max-w-none dark:prose-invert">
                              {isWaiting ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-3 w-full rounded" />
                                  <Skeleton className="h-3 w-4/5 rounded" />
                                  <Skeleton className="h-3 w-3/5 rounded" />
                                </div>
                              ) : modelMessage?.error ? (
                                <div className="text-red-600 dark:text-red-400 text-sm">
                                  Error: {modelMessage.error}
                                </div>
                              ) : modelMessage?.content ? (
                                <TruncatedContent content={modelMessage.content} />
                              ) : (
                                <div className="text-gray-400 dark:text-gray-500 italic text-center py-4 text-sm">
                                  Waiting for response...
                                </div>
                              )}
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}


              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-100/50 dark:border-gray-800/50">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <div className="flex-1 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message..."
                className="w-full px-4 py-3 pr-12 border border-gray-200 dark:border-gray-800 rounded-xl bg-gray-50/40 dark:bg-gray-900/40 focus:bg-white dark:focus:bg-gray-900 focus:border-gray-300 dark:focus:border-gray-700 focus:ring-0 transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-gray-900 dark:text-white resize-none overflow-y-auto min-h-[48px] max-h-32"
                style={{ height: '48px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = '48px';
                  target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                }}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-black dark:text-white hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-lg font-medium"
              >
                ▲▼
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
