import type { BridgeErrorDetail } from "./bridge.types";

export class BridgeHandledError extends Error {
  statusCode: number;
  errorCode: string;
  detail?: BridgeErrorDetail;

  constructor(message: string, statusCode: number, errorCode: string, detail?: BridgeErrorDetail) {
    super(message);
    this.name = "BridgeHandledError";
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.detail = detail;
  }
}

export function isBridgeHandledError(error: unknown): error is BridgeHandledError {
  return error instanceof BridgeHandledError;
}
