export default function isValidEmail(email) {
  // Checks for: non-spaces before @, non-spaces after @, a dot, and at least 2 characters for TLD
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  return emailRegex.test(email);
}

// Examples
