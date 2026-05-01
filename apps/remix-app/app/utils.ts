export function nameInitials(name: string) {
  const initials = name.split(" ").map((word) => word[0]);
  return initials.length === 1
    ? initials[0]
    : `${initials[0]}${initials[initials.length - 1]}`;
}

export function getAuthToken(sessionToken: string): string {
  console.log("getAuthToken called with token:", sessionToken);
  return sessionToken;
}
