import type {
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalRule,
} from "@/lib/db";

/**
 * Sync message types for P2P communication
 */
export enum SyncMessageType {
  /** Initial handshake - exchange device IDs */
  HELLO = "HELLO",
  /** Request changes since a timestamp */
  SYNC_REQUEST = "SYNC_REQUEST",
  /** Send changed data */
  SYNC_DATA = "SYNC_DATA",
  /** Acknowledge received data */
  ACK = "ACK",
  /** Error message */
  ERROR = "ERROR",
}

/**
 * Base message structure
 */
export interface SyncMessageBase {
  type: SyncMessageType;
  timestamp: string; // ISO timestamp
  senderId: string; // Device ID
}

/**
 * Hello message - initial handshake
 */
export interface HelloMessage extends SyncMessageBase {
  type: SyncMessageType.HELLO;
  payload: {
    deviceName?: string;
    version: string; // App version for compatibility
  };
}

/**
 * Sync request - ask for changes since timestamp
 */
export interface SyncRequestMessage extends SyncMessageBase {
  type: SyncMessageType.SYNC_REQUEST;
  payload: {
    since: string; // ISO timestamp
  };
}

/**
 * Sync data - send changed records
 */
export interface SyncDataMessage extends SyncMessageBase {
  type: SyncMessageType.SYNC_DATA;
  payload: {
    data: {
      categories?: LocalCategory[];
      transactions?: LocalTransaction[];
      budgets?: LocalBudget[];
      rules?: LocalRule[];
    };
    isFullSync: boolean;
  };
}

/**
 * Acknowledgment message
 */
export interface AckMessage extends SyncMessageBase {
  type: SyncMessageType.ACK;
  payload: {
    receivedCount: number;
  };
}

/**
 * Error message
 */
export interface ErrorMessage extends SyncMessageBase {
  type: SyncMessageType.ERROR;
  payload: {
    code: string;
    message: string;
  };
}

export type SyncMessage =
  | HelloMessage
  | SyncRequestMessage
  | SyncDataMessage
  | AckMessage
  | ErrorMessage;

// Current protocol version
export const PROTOCOL_VERSION = "1.0.0";

// Device ID stored in memory (set on init)
let currentDeviceId = "";

export function setDeviceId(id: string) {
  currentDeviceId = id;
}

/**
 * Create a HELLO message
 */
export function createHelloMessage(deviceId: string): HelloMessage {
  setDeviceId(deviceId);
  return {
    type: SyncMessageType.HELLO,
    timestamp: new Date().toISOString(),
    senderId: deviceId,
    payload: {
      version: PROTOCOL_VERSION,
    },
  };
}

/**
 * Create a SYNC_REQUEST message
 */
export function createSyncRequestMessage(since: Date): SyncRequestMessage {
  return {
    type: SyncMessageType.SYNC_REQUEST,
    timestamp: new Date().toISOString(),
    senderId: currentDeviceId,
    payload: {
      since: since.toISOString(),
    },
  };
}

/**
 * Create a SYNC_DATA message
 */
export function createSyncDataMessage(
  data: {
    categories?: LocalCategory[];
    transactions?: LocalTransaction[];
    budgets?: LocalBudget[];
    rules?: LocalRule[];
  },
  isFullSync = false
): SyncDataMessage {
  return {
    type: SyncMessageType.SYNC_DATA,
    timestamp: new Date().toISOString(),
    senderId: currentDeviceId,
    payload: {
      data,
      isFullSync,
    },
  };
}

/**
 * Create an ACK message
 */
export function createAckMessage(receivedCount = 0): AckMessage {
  return {
    type: SyncMessageType.ACK,
    timestamp: new Date().toISOString(),
    senderId: currentDeviceId,
    payload: {
      receivedCount,
    },
  };
}

/**
 * Create an ERROR message
 */
export function createErrorMessage(code: string, message: string): ErrorMessage {
  return {
    type: SyncMessageType.ERROR,
    timestamp: new Date().toISOString(),
    senderId: currentDeviceId,
    payload: {
      code,
      message,
    },
  };
}

/**
 * Validate message structure
 */
export function isValidMessage(data: unknown): data is SyncMessage {
  if (typeof data !== "object" || data === null) return false;

  const msg = data as Record<string, unknown>;

  if (typeof msg.type !== "string") return false;
  if (typeof msg.timestamp !== "string") return false;
  if (typeof msg.senderId !== "string") return false;

  return Object.values(SyncMessageType).includes(msg.type as SyncMessageType);
}

/**
 * Serialize dates in sync data for transmission
 * (Dates become strings in JSON, need to convert back)
 */
export function serializeSyncData<T>(data: T): T {
  return JSON.parse(JSON.stringify(data, (key, value) => {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value;
  }));
}

/**
 * Deserialize dates in received sync data
 */
export function deserializeSyncData<T extends Record<string, unknown>>(data: T): T {
  const dateFields = [
    "date",
    "createdAt",
    "_lastModified",
    "lastSyncTimestamp",
  ];

  function processValue(value: unknown): unknown {
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return new Date(value);
    }
    if (Array.isArray(value)) {
      return value.map(processValue);
    }
    if (typeof value === "object" && value !== null) {
      return processObject(value as Record<string, unknown>);
    }
    return value;
  }

  function processObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (dateFields.includes(key) && typeof value === "string") {
        result[key] = new Date(value);
      } else {
        result[key] = processValue(value);
      }
    }
    return result;
  }

  return processObject(data) as T;
}
