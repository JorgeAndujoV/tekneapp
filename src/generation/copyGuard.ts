const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export const wordsOf = (text: string) =>
  plain(text)
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

export function copiesNote(text: string, note: string, run: number): boolean {
  const noteWords = wordsOf(note);
  if (noteWords.length < run) return false;
  // padded with spaces so a run only matches on word boundaries, not inside a longer word
  const haystack = ` ${wordsOf(text).join(" ")} `;
  for (let i = 0; i + run <= noteWords.length; i++) {
    if (haystack.includes(` ${noteWords.slice(i, i + run).join(" ")} `)) return true;
  }
  return false;
}

export function keepsFrame(base: string, adapted: string, share: number): boolean {
  const baseWords = [...new Set(wordsOf(base).filter((word) => word.length >= 3))];
  if (baseWords.length === 0) return true;
  const adaptedWords = new Set(wordsOf(adapted));
  return baseWords.filter((word) => adaptedWords.has(word)).length / baseWords.length >= share;
}
