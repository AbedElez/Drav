import React from 'react';

interface AutocompleteProps {
  suggestions: string[];
  selectedIndex: number;
  onSelect: (suggestion: string) => void;
  onClose: () => void;
  className?: string;
}

export function Autocomplete({ 
  suggestions, 
  selectedIndex, 
  onSelect, 
  onClose,
  className = ""
}: AutocompleteProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={`absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-lg dark:shadow-xl max-h-60 overflow-y-auto ${className}`}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-150 first:rounded-t-xl last:rounded-b-xl ${
            index === selectedIndex ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'
          }`}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
}
