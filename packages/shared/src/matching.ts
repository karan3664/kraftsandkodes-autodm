export type MatchType = "exact" | "contains" | "all_comments";

export const MATCH_ALL_KEYWORD = "*";

export function isMatchAllKeywords(keywords: string[]) {
  return keywords.length === 1 && keywords[0] === MATCH_ALL_KEYWORD;
}

export type AutomationMatchInput = {
  keyword: string;
  matchType: MatchType;
  caseSensitive: boolean;
};

function normalize(value: string, caseSensitive: boolean): string {
  const trimmed = value.normalize("NFKC").trim();
  return caseSensitive ? trimmed : trimmed.toLocaleLowerCase();
}

function stripOuterPunctuation(value: string): string {
  return value.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
}

function tokenize(value: string): string[] {
  return value
    .split(/[\s]+/u)
    .map((token) => stripOuterPunctuation(token))
    .filter((token) => token.length > 0);
}

export function normalizeKeyword(
  keyword: string,
  caseSensitive: boolean,
): string {
  const compact = keyword.normalize("NFKC").trim().replace(/\s+/gu, " ");
  return caseSensitive ? compact : compact.toLocaleLowerCase();
}

export type RankedAutomation = {
  id: string;
  createdAt: number;
  matchType: MatchType;
  caseSensitive: boolean;
  keywords: string[];
};

/**
 * One comment produces at most one selected automation.
 * Order: exact match type, then the longest matched keyword, then the oldest automation.
 */
export function selectAutomationMatch(
  commentText: string,
  automations: RankedAutomation[],
): { automationId: string; matchedKeyword: string } | null {
  const matches = automations.flatMap((automation) => {
    const matchedKeyword = matchKeywords(commentText, automation.keywords, {
      matchType: automation.matchType,
      caseSensitive: automation.caseSensitive,
    });
    return matchedKeyword ? [{ automation, matchedKeyword }] : [];
  });

  matches.sort((left, right) => {
    const typeRank =
      matchRank(right.automation.matchType) -
      matchRank(left.automation.matchType);
    if (typeRank !== 0) {
      return typeRank;
    }
    const lengthRank = right.matchedKeyword.length - left.matchedKeyword.length;
    if (lengthRank !== 0) {
      return lengthRank;
    }
    return left.automation.createdAt - right.automation.createdAt;
  });

  const winner = matches[0];
  if (!winner) {
    return null;
  }
  return {
    automationId: winner.automation.id,
    matchedKeyword: winner.matchedKeyword,
  };
}

function matchRank(matchType: MatchType) {
  if (matchType === "exact") return 2;
  if (matchType === "contains") return 1;
  return 0;
}

export function matchKeywords(
  commentText: string,
  keywords: string[],
  options: Omit<AutomationMatchInput, "keyword">,
): string | null {
  if (options.matchType === "all_comments" || isMatchAllKeywords(keywords)) {
    return commentText.trim() ? MATCH_ALL_KEYWORD : null;
  }
  const ordered = [...keywords].sort(
    (left, right) => right.length - left.length,
  );
  for (const keyword of ordered) {
    if (matchAutomation(commentText, { ...options, keyword })) {
      return keyword;
    }
  }
  return null;
}

export function matchAutomation(
  commentText: string,
  automation: AutomationMatchInput,
): boolean {
  const comment = normalize(commentText, automation.caseSensitive);
  if (!comment) {
    return false;
  }
  if (automation.matchType === "all_comments") {
    return true;
  }

  const keyword = normalize(automation.keyword, automation.caseSensitive);
  if (!keyword) {
    return false;
  }

  if (automation.matchType === "exact") {
    if (comment === keyword) {
      return true;
    }
    return stripOuterPunctuation(comment) === keyword;
  }

  if (comment === keyword || comment.includes(keyword)) {
    const tokens = tokenize(comment);
    if (tokens.some((token) => token === keyword)) {
      return true;
    }
    return (
      comment.includes(` ${keyword} `) ||
      comment.startsWith(`${keyword} `) ||
      comment.endsWith(` ${keyword}`)
    );
  }

  const tokens = tokenize(comment);
  return tokens.some((token) => token === keyword);
}
