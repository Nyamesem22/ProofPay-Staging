export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, "BAD_REQUEST", message, details);
export const unauthorised = (message = "Authentication required.") => new AppError(401, "UNAUTHORISED", message);
export const forbidden = (message = "You do not have permission to perform this action.") => new AppError(403, "FORBIDDEN", message);
export const notFound = (message = "The requested record was not found.") => new AppError(404, "NOT_FOUND", message);
export const conflict = (message) => new AppError(409, "CONFLICT", message);
export const payloadTooLarge = (message = "The request body is too large.") => new AppError(413, "PAYLOAD_TOO_LARGE", message);
export const unavailable = (message = "This service is not configured yet.") => new AppError(503, "SERVICE_NOT_CONFIGURED", message);
