# Authorify Client

This is the client for our [Authorify][1] authentication and authorization middleware for a REST server.

## Installation

Install `authorify-client` as usual:

    $ npm install --save authorify-client

## Usage

You can use `authorify-client` both in node and in browser environment. 

#### Node

This client has the same approach of [superagent][5] and you can use it as shown below:

```javascript
// dependencies
var fs = require('fs'),
    authorify = require('authorify-client')({
      host: 'localhost',
      debug: true,
      key: fs.readFileSync('clientCert.key'), 'utf8'),
      cert: fs.readFileSync('clientCert.cer'), 'utf8'),
      ca: fs.readFileSync('serverCA.cer'), 'utf8')
    }),
    uuid = require('node-uuid'),
    id = uuid.v4(),
    app = uuid.v4();

// set a configuration
authorify.set({
  host: 'localhost',    // host of your server
  port: 3000,           // port of your server
  id: id,               // a valid uuid
  app: app              // another valid uuid
});

// login
authorify.login('username', 'password', function(err, res) {
  authorify.post('/test')
    // send a message into the body
    .send({ name: 'alex', surname: 'smith' })
    .end(function(err, res) {
      if (!err) {
        // your logic here
      }
    });
});
```

#### Browser

To create a single file to use in browser environment use a simple script that uses `browserify`:

    $ ./build.sh

and add the obtained `authorify.js` file to your `html` file:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <title>authorify-client example</title>
    </head>
    <body>
        <script src="authorify.js"></script>
        <script src="example.js"></script>
    </body>
</html>
```

The script `example.js` contanins your example code:
    
```javascript
// you have a global authorify variable 
authorify.set({
  host: 'localhost',                            // host of your server
  port: 3000,                                   // port of your server
  id: 'ae92d22b-a9ab-458a-9850-0025dbf11fad',   // a valid uuid
  app: 'c983659a-9572-4471-a3a2-7d45b591d315'   // another valid uuid
});

// login
authorify.login('username', 'password', function(err, res) {
  authorify.post('/test')
    // send a message into the body
    .send({ name: 'alex', surname: 'smith' }))
    .end(function(err, res) {
      if (!err) {
        // your logic here
      }
    });
});
```
    
See [Authorify][1] `test/browser` folder to see more examples.

## Run Tests

As usual we use [mocha][4] as test framework and you can run all tests simply typing:

    $ npm test

For other tests (for node and browser) please read [Authorify][1] documentation and the local documentation into `doc` folder.

## Documentation

To create your own  documentation you must install [JSDuck](https://github.com/senchalabs/jsduck) and type in your terminal:

    $ cd /path-of-package
    $ ./gen_doc.sh

See full documentation into _doc_ folder.

## Convention

The version number is laid out as: major.minor.patch and tries to follow semver as closely as possible but this is how we use our version numbering:

#### major
A major and possible breaking change has been made in the authorify core. These changes could be not backwards compatible with older versions.

#### minor
New features are added or a big change has happened with one of the third party libraries.

#### patch
A bug has been fixed, without any major internal and breaking changes.

# Contributing

To contribute to the project follow the [GitHub guidelines][6].

# License

This program is released under a GNU Affero General Public License version 3 or above, which in summary means:

You __can use__ this program for __no cost__.
You __can use__ this program for __both personal and commercial reasons__.
You __do not have to share your own program's code__ which uses this program.
You __have to share modifications__ (e.g bug-fixes) you've made to this program.
For more convoluted language, see the LICENSE file.


[1]: https://www.npmjs.org/package/authorify
[2]: http://redis.io
[3]: https://developer.chrome.com/extensions/xhr
[4]: https://www.npmjs.org/package/mocha
[5]: https://www.npmjs.org/package/superagent
[6]: https://guides.github.com/activities/contributing-to-open-source/index.html#contributing
