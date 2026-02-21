export class CadenceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'CadenceError'
  }
}

export class CadenceWebhookError extends CadenceError {
  constructor(message: string) {
    super(message, 'WEBHOOK_VERIFICATION_FAILED')
    this.name = 'CadenceWebhookError'
  }
}

export class CadenceCheckoutError extends CadenceError {
  constructor(message: string) {
    super(message, 'INVALID_CHECKOUT_PARAMS')
    this.name = 'CadenceCheckoutError'
  }
}

export class CadenceMetadataError extends CadenceError {
  constructor(message: string) {
    super(message, 'INVALID_METADATA')
    this.name = 'CadenceMetadataError'
  }
}
