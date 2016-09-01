# mongoose-error

Small Node.js utility to normalize mongoose errors.

### Installation

```
$ npm install mongoose-error --save
```

### Usage

`mongoose-error` normalize the error message to include the first validation error, and can also catch mongo duplicate key.

```js
const mongooseError = require('mongoose-error');

user.save()
.then(
    () => {
        console.log('saved!');
    },
    (err) => {
        throw mongooseError(err, {
            DuplicateKey: 'An user with this username already exist'
        });
    }
);
```
