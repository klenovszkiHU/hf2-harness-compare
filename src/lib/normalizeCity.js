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
