import type {
  AnalysisRequest,
  AnalysisResponse,
} from "@sih/shared-types";

export class IntelligenceClientError extends Error {
  public readonly statusCode: number;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode: number, isRetryable: boolean) {
    super(message);
    this.name = "IntelligenceClientError";
    this.statusCode = statusCode;
    this.isRetryable = isRetryable;
  }
}

export interface AnalyzeCaseOptions {
  timeoutMs?: number;
}

/**
 * Sends a case graph and transactions payload to the Python Intelligence service for analysis.
 *
 * Error handling contract:
 * - 4xx responses throw non-retryable IntelligenceClientError (isRetryable: false)
 * - 5xx responses or network errors throw retryable IntelligenceClientError (isRetryable: true)
 * - Timeout aborts after timeoutMs (default: 30,000ms)
 */
export async function analyzeCase(
  input: AnalysisRequest,
  baseUrl: string,
  options?: AnalyzeCaseOptions
): Promise<AnalysisResponse> {
  const timeoutMs = options?.timeoutMs ?? 30_000;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, "");
  const url = cleanBaseUrl.endsWith("/v1")
    ? `${cleanBaseUrl}/analyze`
    : `${cleanBaseUrl}/v1/analyze`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    throw new IntelligenceClientError(
      `Intelligence service request failed: ${errorMsg}`,
      500,
      true
    );
  }

  if (!response.ok) {
    let errorDetail = "";
    try {
      const errBody = await response.text();
      errorDetail = `: ${errBody}`;
    } catch {
      // ignore parsing error
    }

    const is4xx = response.status >= 400 && response.status < 500;
    throw new IntelligenceClientError(
      `Intelligence service returned HTTP ${response.status} ${response.statusText}${errorDetail}`,
      response.status,
      !is4xx
    );
  }

  const json = (await response.json()) as AnalysisResponse;
  return json;
}
