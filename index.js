const createError = require('http-errors');
const mongoErrors = require('mongo-errors');
const mongoose = require('mongoose');
const MongoError = require('mongodb-core').MongoError;

/**
 * Normalize <errArg> to an <http-errors> if <errorCode> matches the <mongo-errors> code <errorName>
 * i.e. errorCode == mongoErrors[<errorName>]
 *
 * @param  {Number} errorCode
 * @param  {String} errorName  A mongo-errors error name
 *
 * @param  {String/Object/Error} errArg
 * <errArg> can either be:
 *     a <String> to create a HTTP 400
 *     an <Object> with 'statusCode' and 'message' properties to create the HTTP error
 *     an <Error> directly
 *
 * @return {Error}
 */
function findMongoError(errorCode, errorName, errArg) {
    let normalizedError = null;

    // Convert to correct error type
    if (
        errorCode == mongoErrors[errorName] ||
        // Special case for missing DuplicateKey error
        errorName == 'DuplicateKey' && errorCode == '11001'
    ) {
        // Normalize error based on passed argument
        const argType = Object.prototype.toString.call(errArg);
        // Create a 400 if arg is a string
        if (argType == '[object String]') {
            normalizedError = createError(400, errArg);
        }
        // Use arg.statusCode and arg.message if arg is an object
        else if (argType == '[object Object]') {
            normalizedError = createError(errArg.statusCode, errArg.message);
        }
        // Use arg if is already an error
        else if (argType == '[object Error]') {
            normalizedError = errArg;
        }
    }

    return normalizedError;
}

/**
 * Return true if an error is from mongo or mongoose.
 * @param {Error} error
 * @return {Boolean}
 */
function isMongoError(error) {
    return (
        (error instanceof mongoose.Error) ||
        (error instanceof MongoError) ||
        (error.name == 'MongoError')
    );
}

/**
 * Normalize the <err> mongoose error
 * User can pass an optional <opts> hash containing <mongo-errors> formatted names
 * to add details to the normalized error. It can either be a:
 *     <String>: the error will be a 400 with the <String> as message
 *     <Object>: the error will be a <Object.statusCode> HTTP error with <Object.message> as message
 *     <Error>:  to pass a user defined error
 *
 * @param  {Object} err  The mongoose error to normalize
 * @param  {Object} opts The optional formatting hash
 * @return {Error}       The normalized error
 */
module.exports = (err, opts) => {
    // Ignore error that doesn't come from mongoose
    if (!isMongoError(err)) {
        return err;
    }

    // Default options
    opts = opts || {};

    // Normalized error container
    let globalError = null;

    // Mongoose error does not contain sub-errors
    if (!err.errors || err.errors.length == 0) {
        // Search for user-defined error cases in opts
        for (const userError in opts) {
            globalError = findMongoError(err.code, userError, opts[userError]);
        }

        // Return found error
        if (Boolean(globalError)) {
            return globalError;
        }
    }

    // Normalize errors as a map (path: { message: <msg> })
    const errors = {};
    Object.keys(err.errors || {})
    .forEach((errorId, i) => {
        const _err = err.errors[errorId];
        // Invalid error
        if (!_err || !_err.path || !_err.message) {
            return;
        }

        // Format error
        errors[_err.path] = { message: _err.message };
    });

    // No valid sub-errors, normalize passed mongoose <err> object
    if (Object.keys(errors).length == 0) {
        globalError = createError(400, err.message || err);
        return globalError;
    }

    // Finally, use first sub-error
    globalError = createError(422, errors[Object.keys(errors)[0]]);
    globalError.errors = errors;

    return globalError;
};
