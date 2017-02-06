const expect = require('expect');
const mongoose = require('mongoose');
const ValidationError = require('mongoose/lib/error/validation');

const mongooseError = require('./');

describe('mongoose-error', () => {

    it('should not transform other errors', () => {
        const origin = new Error('something');
        const err = mongooseError(origin);

        expect(err).toBe(origin);
    });

    it('should normalize ValidationError as 400', () => {
        const origin = new ValidationError();
        const err = mongooseError(origin);

        expect(err.statusCode).toBe(400);
    });

});
