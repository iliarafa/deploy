import type { ColabMessage } from "@shared/schema";

export interface SearchOptions {
  caseSensitive?: boolean;
  wholeWord?: boolean;
  searchInUsername?: boolean;
}

/**
 * Filter messages based on search term and options
 */
export function filterMessages(
  messages: ColabMessage[],
  searchTerm: string,
  options: SearchOptions = {}
): ColabMessage[] {
  if (!searchTerm.trim()) {
    return messages;
  }

  const {
    caseSensitive = false,
    wholeWord = false,
    searchInUsername = true
  } = options;

  const term = caseSensitive ? searchTerm.trim() : searchTerm.trim().toLowerCase();

  return messages.filter(message => {
    // Prepare text to search in
    const content = caseSensitive ? message.content : message.content.toLowerCase();
    const username = caseSensitive ? message.username : message.username.toLowerCase();

    // Create search patterns
    let contentMatch = false;
    let usernameMatch = false;

    if (wholeWord) {
      // Use word boundary regex for whole word matching (no global flag to avoid stateful issues)
      const flags = caseSensitive ? '' : 'i';
      const contentRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
      contentMatch = contentRegex.test(content);
      if (searchInUsername) {
        const usernameRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, flags);
        usernameMatch = usernameRegex.test(username);
      }
    } else {
      // Simple substring matching
      contentMatch = content.includes(term);
      if (searchInUsername) {
        usernameMatch = username.includes(term);
      }
    }

    return contentMatch || (searchInUsername && usernameMatch);
  });
}

/**
 * Highlight matching text segments in a string
 */
export function getHighlightSegments(
  text: string,
  searchTerm: string,
  caseSensitive = false
): Array<{ text: string; isHighlight: boolean }> {
  if (!searchTerm.trim()) {
    return [{ text, isHighlight: false }];
  }

  const flags = caseSensitive ? 'g' : 'gi';
  const escapedTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escapedTerm})`, flags);
  
  const parts = text.split(regex);
  const normalizedTerm = caseSensitive ? searchTerm : searchTerm.toLowerCase();
  
  return parts.map(part => {
    const normalizedPart = caseSensitive ? part : part.toLowerCase();
    return {
      text: part,
      isHighlight: normalizedPart === normalizedTerm
    };
  });
}

/**
 * Count total search matches across all messages
 */
export function countSearchMatches(
  messages: ColabMessage[],
  searchTerm: string,
  options: SearchOptions = {}
): number {
  const filteredMessages = filterMessages(messages, searchTerm, options);
  
  if (!searchTerm.trim()) {
    return 0;
  }

  let totalMatches = 0;
  const term = options.caseSensitive ? searchTerm.trim() : searchTerm.trim().toLowerCase();
  const flags = options.caseSensitive ? 'g' : 'gi';
  const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = options.wholeWord 
    ? new RegExp(`\\b${escapedTerm}\\b`, flags)
    : new RegExp(escapedTerm, flags);

  filteredMessages.forEach(message => {
    const content = options.caseSensitive ? message.content : message.content.toLowerCase();
    const matches = content.match(regex);
    if (matches) {
      totalMatches += matches.length;
    }

    if (options.searchInUsername !== false) {
      const username = options.caseSensitive ? message.username : message.username.toLowerCase();
      const usernameMatches = username.match(regex);
      if (usernameMatches) {
        totalMatches += usernameMatches.length;
      }
    }
  });

  return totalMatches;
}

/**
 * Find the next/previous search match for navigation
 */
export function findSearchMatch(
  messages: ColabMessage[],
  searchTerm: string,
  currentIndex: number,
  direction: 'next' | 'previous',
  options: SearchOptions = {}
): number | null {
  const filteredMessages = filterMessages(messages, searchTerm, options);
  
  if (filteredMessages.length === 0 || !searchTerm.trim()) {
    return null;
  }

  // Find indices of filtered messages in original array
  const filteredIndices = filteredMessages.map(msg => 
    messages.findIndex(originalMsg => originalMsg.id === msg.id)
  );

  if (direction === 'next') {
    const nextIndex = filteredIndices.find(index => index > currentIndex);
    return nextIndex !== undefined ? nextIndex : filteredIndices[0];
  } else {
    const reversedIndices = [...filteredIndices].reverse();
    const prevIndex = reversedIndices.find(index => index < currentIndex);
    return prevIndex !== undefined ? prevIndex : filteredIndices[filteredIndices.length - 1];
  }
}