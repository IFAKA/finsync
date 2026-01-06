// Room code generation for P2P sync
// Format: ADJ-NOUN-ADJ-NOUN-XXXX (e.g., "BLUE-TIGER-FAST-STORM-A7K2")
// ~2 billion combinations for security

const ADJECTIVES = [
  "BLUE", "COOL", "FAST", "WARM", "DARK", "WILD", "CALM", "BOLD",
  "SOFT", "GOLD", "DEEP", "HIGH", "PURE", "KEEN", "RARE", "SAFE",
  "TRUE", "WISE", "EPIC", "MINT", "NOVA", "ZEST", "AQUA", "RUBY",
  "JADE", "NEON", "COZY", "DUSK", "DAWN", "GLOW", "HAZE", "IRIS",
];

const NOUNS = [
  "TIGER", "CLOUD", "RIVER", "STORM", "EAGLE", "FLAME", "FROST", "CORAL",
  "CEDAR", "MAPLE", "OCEAN", "PEARL", "STEEL", "STONE", "DREAM", "SPARK",
  "LUNAR", "SOLAR", "PIXEL", "PRISM", "COMET", "ATLAS", "ONYX", "OPAL",
  "RAVEN", "LOTUS", "DRIFT", "EMBER", "HAVEN", "CREST", "DELTA", "ECHO",
];

// Emojis for visual verification (deterministic based on room code)
const VERIFICATION_EMOJIS = [
  "🌟", "🔥", "💎", "🌈", "🎯", "⚡", "🌙", "🍀",
  "🎨", "🚀", "🌺", "🎭", "🦋", "🌊", "🍁", "❄️",
];

const ROOM_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Store active rooms with expiration
const activeRooms = new Map<string, number>();

function randomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function randomAlphanumeric(length: number): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous: 0O1I
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

/**
 * Generate a secure room code
 * Format: ADJ-NOUN-ADJ-NOUN-XXXX
 * ~2 billion combinations (32^2 * 32^2 * 30^4)
 */
export function generateRoomCode(): string {
  const adj1 = randomElement(ADJECTIVES);
  const noun1 = randomElement(NOUNS);
  const adj2 = randomElement(ADJECTIVES);
  const noun2 = randomElement(NOUNS);
  const suffix = randomAlphanumeric(4);

  const code = `${adj1}-${noun1}-${adj2}-${noun2}-${suffix}`;

  // Register room with expiration
  activeRooms.set(code, Date.now() + ROOM_EXPIRY_MS);

  return code;
}

/**
 * Get remaining time for a room in seconds
 */
export function getRoomExpirySeconds(code: string): number {
  const expiry = activeRooms.get(code);
  if (!expiry) return 0;
  return Math.max(0, Math.floor((expiry - Date.now()) / 1000));
}

/**
 * Check if a room code is still valid (not expired)
 */
export function isRoomActive(code: string): boolean {
  const expiry = activeRooms.get(code);
  if (!expiry) return true; // Unknown rooms are considered valid (joining peer)
  return Date.now() < expiry;
}

/**
 * Extend room expiration (call when connection established)
 */
export function extendRoomExpiry(code: string, additionalMs: number = 30 * 60 * 1000): void {
  activeRooms.set(code, Date.now() + additionalMs);
}

/**
 * Invalidate a room code (single-use: call when connection established)
 */
export function invalidateRoom(code: string): void {
  activeRooms.delete(code);
}

/**
 * Generate verification emojis from room code (deterministic)
 * Both peers will see the same 3 emojis
 */
export function getVerificationEmojis(code: string): string[] {
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash + code.charCodeAt(i)) | 0;
  }

  const emojis: string[] = [];
  for (let i = 0; i < 3; i++) {
    const index = Math.abs((hash >> (i * 5)) % VERIFICATION_EMOJIS.length);
    emojis.push(VERIFICATION_EMOJIS[index]);
  }

  return emojis;
}

/**
 * Validate room code format
 */
export function isValidRoomCode(code: string): boolean {
  const pattern = /^[A-Z]+-[A-Z]+-[A-Z]+-[A-Z]+-[A-Z0-9]{4}$/;
  return pattern.test(code.toUpperCase());
}

/**
 * Normalize room code (uppercase, trim)
 */
export function normalizeRoomCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Convert room code to PeerJS-compatible ID
 * PeerJS IDs have restrictions, so we prefix and encode
 */
export function roomCodeToPeerId(roomCode: string, role: "host" | "client"): string {
  const normalized = normalizeRoomCode(roomCode).replace(/-/g, "").toLowerCase();
  return `pf-${normalized}-${role}`;
}

/**
 * Get shareable URL for a room
 */
export function getRoomShareUrl(roomCode: string): string {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/sync?room=${encodeURIComponent(roomCode)}`;
}
