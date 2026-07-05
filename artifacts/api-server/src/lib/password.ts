import bcrypt from "bcrypt";

// Cost factor: each +1 roughly doubles the time to hash *and* to brute-force.
// 12 is a reasonable balance in 2026 — slow enough to make guessing expensive,
// fast enough (~150-300ms) not to bother a real login.
const SALT_ROUNDS = 12;

export function hashPassword(plainTextPassword: string): Promise<string> {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

export function verifyPassword(
  plainTextPassword: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(plainTextPassword, passwordHash);
}
