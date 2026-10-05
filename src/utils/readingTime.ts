// Minutes to read a post's body at 250 words a minute. Figure code is not
// reading: inline <svg> blocks (path coordinates, attributes) are removed, and
// any other HTML tags are stripped so only their visible text is counted.
// Figure captions stay, since readers do read them.
export function getReadingTime(text: string): number {
  const readable = text
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    // Only real tags (a letter after `<`), so prose like "rate < current" stays.
    .replace(/<\/?[a-zA-Z][^>]*>/g, ' ');
  const words = readable.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 250));
}
