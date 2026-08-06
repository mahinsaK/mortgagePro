import "server-only";

import { AppwriteException } from "node-appwrite";
import { appwriteServerConfig, getAppBaseUrl } from "./config";

type OAuthDiagnosticStage =
  | "oauth_start"
  | "session_exchange"
  | "invalid_session_response"
  | "lender_lookup"
  | "session_storage";

type OAuthDiagnosticOptions = {
  stage: OAuthDiagnosticStage;
  includeDataConfiguration?: boolean;
  sessionExpiryValid?: boolean;
  sessionSecretPresent?: boolean;
};

export function getSafeAppwriteDiagnostic(
  error: unknown,
  options: OAuthDiagnosticOptions,
) {
  const diagnostic: Record<string, string | number | boolean> = {
    stage: options.stage,
    code: error instanceof AppwriteException ? error.code : "unknown",
    type:
      error instanceof AppwriteException && error.type
        ? error.type
        : "unknown",
    message: sanitizeDiagnosticMessage(
      error instanceof Error ? error.message : "Unknown error",
    ),
    endpoint: getSafeEndpoint(),
    projectId: appwriteServerConfig.projectId || "<missing>",
    callbackOrigin: getSafeCallbackOrigin(),
    clientMode: "sessionless",
  };

  if (options.includeDataConfiguration) {
    diagnostic.runtimeApiKeyConfigured = Boolean(appwriteServerConfig.apiKey);
    diagnostic.databaseId = appwriteServerConfig.databaseId || "<missing>";
    diagnostic.lendersCollectionId =
      appwriteServerConfig.collections.lenders || "<missing>";
  }

  if (typeof options.sessionSecretPresent === "boolean") {
    diagnostic.sessionSecretPresent = options.sessionSecretPresent;
  }

  if (typeof options.sessionExpiryValid === "boolean") {
    diagnostic.sessionExpiryValid = options.sessionExpiryValid;
  }

  return diagnostic;
}

function sanitizeDiagnosticMessage(message: string) {
  return message
    .replace(
      /([?&](?:secret|state|userId)=)[^&\s"'<>]*/gi,
      "$1[redacted]",
    )
    .replace(
      /\b((?:secret|state|userId)\s*[:=]\s*)[^,\s&"'<>]+/gi,
      "$1[redacted]",
    )
    .replace(
      /\beyJ[A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]+){1,2}\b/g,
      "[redacted-token]",
    )
    .replace(/\b[a-f0-9]{48,}\b/gi, "[redacted-value]")
    .slice(0, 300);
}

function getSafeEndpoint() {
  try {
    const endpoint = new URL(appwriteServerConfig.endpoint);
    return `${endpoint.origin}${endpoint.pathname}`;
  } catch {
    return "<invalid>";
  }
}

function getSafeCallbackOrigin() {
  try {
    return getAppBaseUrl();
  } catch {
    return "<invalid>";
  }
}
