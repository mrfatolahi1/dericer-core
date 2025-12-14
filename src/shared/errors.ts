/**
 * Custom error types used by the core domain and application layers.
 */

// Base error class.
export class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "DomainError";
    }
}

export class ValidationError extends DomainError {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export class NotFoundError extends DomainError {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}
