export function pickSelectedInstagramAccount<T extends { id: string }>(
  accounts: T[],
  cookieId: string | undefined,
): T | null {
  if (accounts.length === 0) {
    return null;
  }
  return accounts.find((item) => item.id === cookieId) ?? accounts[0];
}
