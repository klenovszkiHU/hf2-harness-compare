// Matches Unicode combining diacritical marks (U+0300-U+036F), which NFD
// normalization splits accented letters into (e.g. "ó" -> "o" + U+0301).
const DIACRITICS_REGEX = /[̀-ͯ]/g;

function normalizeCity(city) {
  const normalized = city
    .normalize('NFD')
    .replace(DIACRITICS_REGEX, '')
    .trim()
    .toLowerCase();

  if (normalized.includes('budapest')) {
    return 'budapest';
  }

  return normalized;
}

module.exports = normalizeCity;
