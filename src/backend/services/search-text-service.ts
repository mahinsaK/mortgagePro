export function createLoanSearchText({
  borrowerName,
  borrowerContact,
}: {
  borrowerName: string;
  borrowerContact: string;
}) {
  return createBorrowerSearchText({
    borrowerName,
    borrowerContact,
  });
}

export function createBorrowerSearchText({
  borrowerName,
  borrowerContact,
}: {
  borrowerName: string;
  borrowerContact: string;
}) {
  const contactValues = parseContactValues(borrowerContact);
  const baseText = [borrowerName, ...contactValues].join(" ");
  const normalizedWords = normalizeSearchText(baseText).split(" ").filter(Boolean);
  const digitWords = baseText.match(/\d+/g) ?? [];
  const tokens = new Set<string>(normalizedWords);

  for (const word of [...normalizedWords, ...digitWords]) {
    for (const fragment of searchFragments(word)) {
      tokens.add(fragment);
    }
  }

  return Array.from(tokens).join(" ").slice(0, 2000);
}

export function normalizeSearchText(value: string) {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function parseContactValues(value: string) {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    return Object.values(parsed)
      .map((entry) => String(entry ?? ""))
      .filter(Boolean);
  } catch {
    return [value];
  }
}

function searchFragments(value: string) {
  const normalized = normalizeSearchText(value).replaceAll(" ", "");
  const fragments = new Set<string>();
  const maxLength = Math.min(12, normalized.length);

  for (let length = 3; length <= maxLength; length += 1) {
    for (let index = 0; index <= normalized.length - length; index += 1) {
      fragments.add(normalized.slice(index, index + length));
    }
  }

  return fragments;
}
