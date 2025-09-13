import { getHighlightSegments } from "./search-utils";

interface TextHighlighterProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
  caseSensitive?: boolean;
  wholeWord?: boolean;
}

export default function TextHighlighter({ 
  text, 
  searchTerm, 
  className = "", 
  highlightClassName = "bg-yellow-200 dark:bg-yellow-800 font-medium",
  caseSensitive = false,
  wholeWord = false
}: TextHighlighterProps) {
  if (!searchTerm || !text) {
    return <span className={className} data-testid="text-no-highlight">{text}</span>;
  }

  // Use search-utils for consistent highlighting logic
  let segments;
  if (wholeWord) {
    // For whole word matching, use regex with word boundaries
    const flags = caseSensitive ? 'g' : 'gi';
    const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escapedTerm}\\b)`, flags);
    const parts = text.split(regex);
    const normalizedTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    segments = parts.map(part => {
      const normalizedPart = caseSensitive ? part : part.toLowerCase();
      // Check if this part is a whole word match
      const wholeWordRegex = new RegExp(`^\\b${escapedTerm}\\b$`, caseSensitive ? '' : 'i');
      return {
        text: part,
        isHighlight: wholeWordRegex.test(part)
      };
    });
  } else {
    // Use the fixed getHighlightSegments function
    segments = getHighlightSegments(text, searchTerm, caseSensitive);
  }

  return (
    <span className={className} data-testid="text-with-highlights">
      {segments.map((segment, index) => 
        segment.isHighlight ? (
          <mark 
            key={`highlight-${index}`}
            className={highlightClassName}
            data-testid={`highlight-${index}`}
          >
            {segment.text}
          </mark>
        ) : (
          <span key={`text-${index}`}>{segment.text}</span>
        )
      )}
    </span>
  );
}