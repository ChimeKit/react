import type {
  ChimeKitMessageDetailsResponse,
  ChimeKitLinkAction,
  ChimeKitCallbackAction,
} from "../types";
import { isSafeUrl } from "./safeUrl";

/**
 * Validates that a value is a non-empty string
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/**
 * Validates that a value is a string or null
 */
function isStringOrNull(value: unknown): value is string | null {
  return value === null || typeof value === "string";
}

/**
 * Validates that a value is a valid action type
 */
function isValidActionType(value: unknown): value is "primary" | "secondary" {
  return value === "primary" || value === "secondary";
}

/**
 * Validates that a value is a valid HTML anchor target
 */
function isValidTarget(value: unknown): boolean {
  if (value === undefined) return true;
  if (typeof value !== "string") return false;
  // Standard HTML anchor targets
  const validTargets = ["_self", "_blank", "_parent", "_top"];
  return validTargets.includes(value) || value.startsWith("_");
}

/**
 * Validates a link action from the API response
 */
function validateLinkAction(action: unknown): action is ChimeKitLinkAction {
  if (typeof action !== "object" || action === null) {
    return false;
  }

  const obj = action as Record<string, unknown>;

  // Validate required fields
  if (obj.kind !== "link") return false;
  if (!isNonEmptyString(obj.label)) return false;
  if (!isValidActionType(obj.type)) return false;
  if (!isNonEmptyString(obj.href)) return false;

  // Validate URL safety
  if (!isSafeUrl(obj.href)) {
    return false;
  }

  // Validate optional fields
  if (!isValidTarget(obj.target)) return false;
  if (obj.rel !== undefined && typeof obj.rel !== "string") return false;
  if (obj.id !== undefined && typeof obj.id !== "string") return false;

  return true;
}

/**
 * Validates a callback action from the API response
 */
function validateCallbackAction(
  action: unknown
): action is ChimeKitCallbackAction {
  if (typeof action !== "object" || action === null) {
    return false;
  }

  const obj = action as Record<string, unknown>;

  // Validate required fields
  if (obj.kind !== "callback") return false;
  if (!isNonEmptyString(obj.label)) return false;
  if (!isValidActionType(obj.type)) return false;
  if (!isNonEmptyString(obj.actionId)) return false;

  // Validate optional fields
  if (obj.id !== undefined && typeof obj.id !== "string") return false;

  return true;
}

/**
 * Validates an action (either link or callback) from the API response
 */
function validateAction(
  action: unknown
): action is ChimeKitLinkAction | ChimeKitCallbackAction {
  if (action === undefined) return true;
  return validateLinkAction(action) || validateCallbackAction(action);
}

export type ValidationResult<T> =
  | { valid: true; data: T }
  | { valid: false; error: string };

/**
 * Validates a ChimeKitMessageDetailsResponse from the API
 *
 * This validation ensures:
 * 1. Required fields are present and correctly typed
 * 2. Action URLs pass safe URL validation (http, https, mailto, tel protocols only)
 * 3. Action structures match expected schemas
 */
export function validateMessageDetailsResponse(
  response: unknown
): ValidationResult<ChimeKitMessageDetailsResponse> {
  if (typeof response !== "object" || response === null) {
    return { valid: false, error: "Response must be an object" };
  }

  const obj = response as Record<string, unknown>;

  // Validate required fields
  if (!isNonEmptyString(obj.messageId)) {
    return { valid: false, error: "messageId must be a non-empty string" };
  }

  if (!isStringOrNull(obj.title)) {
    return { valid: false, error: "title must be a string or null" };
  }

  if (!isStringOrNull(obj.snippet)) {
    return { valid: false, error: "snippet must be a string or null" };
  }

  if (!isNonEmptyString(obj.createdAt)) {
    return { valid: false, error: "createdAt must be a non-empty string" };
  }

  if (typeof obj.bodyHtml !== "string") {
    return { valid: false, error: "bodyHtml must be a string" };
  }

  if (!isStringOrNull(obj.category)) {
    return { valid: false, error: "category must be a string or null" };
  }

  // Validate actions
  if (obj.primaryAction !== undefined && !validateAction(obj.primaryAction)) {
    return {
      valid: false,
      error: "primaryAction has invalid structure or unsafe URL",
    };
  }

  if (
    obj.secondaryAction !== undefined &&
    !validateAction(obj.secondaryAction)
  ) {
    return {
      valid: false,
      error: "secondaryAction has invalid structure or unsafe URL",
    };
  }

  return {
    valid: true,
    data: response as ChimeKitMessageDetailsResponse,
  };
}

/**
 * Strips invalid actions from a message details response
 * This is a safer alternative that preserves the message content
 * while removing potentially dangerous actions
 */
export function sanitizeMessageDetailsResponse(
  response: ChimeKitMessageDetailsResponse
): ChimeKitMessageDetailsResponse {
  const sanitized = { ...response };

  if (
    sanitized.primaryAction &&
    !validateAction(sanitized.primaryAction)
  ) {
    delete sanitized.primaryAction;
  }

  if (
    sanitized.secondaryAction &&
    !validateAction(sanitized.secondaryAction)
  ) {
    delete sanitized.secondaryAction;
  }

  return sanitized;
}
