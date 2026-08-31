function visibleText(html: string): string {
  return String(html ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizedText(value: string): string {
  return visibleText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function headingKeys(html: string): Set<string> {
  const headings = new Set<string>();
  const pattern = /<h[2-4]\b[^>]*>([\s\S]*?)<\/h[2-4]>/gi;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(html)) !== null) {
    const key = normalizedText(match[1]);
    if (key) headings.add(key);
  }

  return headings;
}

function meaningfulWords(html: string): Set<string> {
  const stopWords = new Set([
    'avec', 'cette', 'dans', 'des', 'elle', 'elles', 'est', 'les', 'leur', 'leurs', 'mais', 'nous',
    'pour', 'plus', 'que', 'qui', 'son', 'sont', 'sur', 'une', 'vous', 'votre',
  ]);

  return new Set(
    normalizedText(html)
      .split(' ')
      .filter((word) => word.length >= 4 && !stopWords.has(word))
  );
}

/**
 * Detect when a secondary CMS article repeats the editorial guide already
 * selected for a category page. Repeated section headings are the strongest
 * signal. The word-containment fallback is deliberately conservative so a
 * complementary buying guide is not hidden merely because it discusses the
 * same product family.
 */
export function isSubstantivelyDuplicateHtml(primary: string, secondary: string): boolean {
  if (!primary.trim() || !secondary.trim()) return false;

  const primaryHeadings = headingKeys(primary);
  const secondaryHeadings = headingKeys(secondary);
  let sharedHeadings = 0;

  for (const heading of secondaryHeadings) {
    if (primaryHeadings.has(heading)) sharedHeadings += 1;
  }

  if (sharedHeadings >= 2) return true;

  const primaryWords = meaningfulWords(primary);
  const secondaryWords = meaningfulWords(secondary);
  const smallerSize = Math.min(primaryWords.size, secondaryWords.size);
  if (smallerSize < 35) return false;

  let sharedWords = 0;
  for (const word of secondaryWords) {
    if (primaryWords.has(word)) sharedWords += 1;
  }

  const containment = sharedWords / smallerSize;
  return sharedHeadings >= 1 ? containment >= 0.72 : containment >= 0.86;
}
