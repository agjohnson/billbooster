/* Exceptions */

function HttpError(message, status_code) {
    this.message = message;
    this.status_code = status_code || 500;
    this.stack = Error().stack;
}

HttpError.prototype = Object.create(Error.prototype)
HttpError.prototype.constructor = HttpError;
HttpError.prototype.name = 'HttpError'

module.exports.HttpError = HttpError;
