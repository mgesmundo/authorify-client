/**
 * A client (for node and browser) for {@link https://www.npmjs.org/package/authorify Authorify}
 * authorization and authentication system for REST server.
 *
 *
 * @class node_modules.authorify_client
 *
 * @author Marcello Gesmundo
 * 
 * ## Usage
 * 
 * You can use `authorify-client` both in node and in browser environment. 
 * 
 * #### Node
 * 
 * This client has the same approach of [superagent][1] and you can use it as shown below:
 * 
 *      // dependencies
 *      var fs = require('fs'),
 *          authorify = require('authorify-client')({
 *            host: 'localhost',
 *            debug: true,
 *            key: fs.readFileSync('clientCert.key'), 'utf8'),
 *            cert: fs.readFileSync('clientCert.cer'), 'utf8'),
 *            ca: fs.readFileSync('serverCA.cer'), 'utf8')
 *          }),
 *          uuid = require('node-uuid'),
 *          id = uuid.v4(),
 *          app = uuid.v4();
 *      
 *      // use a configuration
 *      authorify.set({
 *        host: 'localhost',    // host of your server
 *        port: 3000,           // port of your server
 *        id: id,               // a valid uuid
 *        app: app              // another valid uuid
 *      });
 *      
 *      // login
 *      authorify.login('username', 'password', function(err, res) {
 *        authorify.post('/test')
 *          // send a message into the body
 *          .send({ name: 'alex', surname: 'smith' })
 *          .end(function(err, res) {
 *            if (!err) {
 *              // your logic here
 *            }
 *          });
 *      });
 * 
 * #### Browser
 * 
 * To create a single file to use in browser environment use a simple script that uses `browserify`:
 * 
 *      $ ./build.sh
 * 
 * and add the obtained file to your `html` file:
 * 
 *      <!DOCTYPE html>
 *      <html>
 *          <head>
 *              <meta charset="utf-8">
 *              <title>authorify-client example</title>
 *          </head>
 *          <body>
 *              <script src="authorify.js"></script>
 *              <script src="example.js"></script>
 *          </body>
 *      </html>
 * 
 * The script `example.js` contanins your example code:
 *     
 *      // you have a global authorify variable 
 *      authorify.set({
 *        host: 'localhost',                            // host of your server
 *        port: 3000,                                   // port of your server
 *        id: 'ae92d22b-a9ab-458a-9850-0025dbf11fad',   // a valid uuid
 *        app: 'c983659a-9572-4471-a3a2-7d45b591d315'   // another valid uuid
 *      });
 *      
 *      // login
 *      authorify.login('username', 'password', function(err, res) {
 *        authorify.post('/test')
 *          // send a message into the body
 *          .send({ name: 'alex', surname: 'smith' }))
 *          .end(function(err, res) {
 *            if (!err) {
 *              // your logic here
 *            }
 *          });
 *      });
 *     
 * See [Authorify][2] `test/browser` folder to see more examples.
 * 
 * [1]: https://www.npmjs.org/package/superagent
 * [2]: https://www.npmjs.org/package/authorify
 *
 * # License
 *
 * Copyright (c) 2012-2014 Yoovant by Marcello Gesmundo. All rights reserved.
 *
 * This program is released under a GNU Affero General Public License version 3 or above, which in summary means:
 *
 * - You __can use__ this program for __no cost__.
 * - You __can use__ this program for __both personal and commercial reasons__.
 * - You __do not have to share your own program's code__ which uses this program.
 * - You __have to share modifications__ (e.g bug-fixes) you've made to this program.
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  //TODO: create a plugin to ban the IP with an high number of failing requests (add as last middleware)

  // dependencies
  var _              = app._,
      mixin          = app.mixin,
      agent          = app.superagent,
      Class          = app.jsface.Class,
      Store          = app.class.Store,
      Header         = app.class.Header,
      Handshake      = app.class.Handshake,
      Authentication = app.class.Authentication,
      Authorization  = app.class.Authorization,
      util           = app.util,
      async          = app.async,
      log            = app.logger,
      sessionStore   = app.sessionStore,
      config         = app.config,
      debug          = config.debug,
      authHeaderKey  = config.authHeader,
      errors         = app.errors;

  var CError = errors.InternalError,
      wsPlugin;

  errors.set({
    format: function(e, mode) {
      mode = mode || 'msg';
      if (mode === 'msg') {
        return util.format('%s %s', app.name, e.message);
      }
      return util.format('%s %s', app.name, e.body);
    }
  });

  // namespace
  var my = {
    'class'  : app.class,
    'helper' : app.helper,
    'mixin'  : app.mixin,
    'config' : {},          // the active configuration
    'configs': {},          // all available configurations
    'plugin' : {}           // all loaded plugins
  };

  var defaultConfigName = 'config';

  /**
   * Add a name field if missing and if opts is an object.
   * Make a new object with name field (set to opts) if opts is a string.
   *
   * @param {Object/String} opts The options object or string with the required name
   * @returns {Object} The configuration
   * @private
   * @ignore
   */
  function formatOptions(opts) {
    if (opts) {
      if (_.isObject(opts)) {
        opts.name = opts.name || defaultConfigName;
      } else if ('string' === typeof opts) {
        opts = {
          name: opts
        };
      }
    } else {
      opts = {
        name: defaultConfigName
      };
    }
    return opts;
  }

  /**
   * Get all options with default values if empty
   *
   * @param {Object/String} opts The options object or string with the required name
   * @returns {Object} The configuration with default values
   * @private
   * @ignore
   */
  function getConfigOptions(opts) {
    opts = formatOptions(opts);
    _.forEach(config, function(value, key) {
      opts[key] = opts[key] || value;
    });
    opts.headers = opts.headers || {};

    return opts;
  }

  /**
   * Make an object with all params
   *
   * @param {String} method The required method
   * @param {String} path The required path
   * @param {String} [transport = 'http'] The transport protocol ('http' or 'ws')
   * @param {Boolean} [plain = false] The required plain
   * @param {Function} callback The required callback
   * @return {Object} An object with all params as properties
   * @private
   * @ignore
   */
  function fixRequestOptions(method, path, transport, plain, callback) {
    var opts = {
      method: method,
      path: path
    };
    if (_.isFunction(transport)) {
      opts.callback = transport;
      opts.plain = false;
      opts.transport = 'http';
    } else {
      if (_.isString(transport)) {
        opts.transport = transport;
      } else if (_.isBoolean(transport)) {
        opts.plain = transport;
      }
      if (_.isFunction(plain)) {
        opts.callback = plain;
        opts.plain = opts.plain || false;
      } else if (_.isBoolean(plain)) {
        opts.callback = callback;
        opts.plain = plain;
      }
    }
    return opts;
  }

  /**
   * Get the authorify-websocket plugin instance if loaded
   * @return {Object}
   * @private
   * @ignore
   */
  function getWebsocketPlugin() {
    if (!wsPlugin) {
      wsPlugin = _.findWhere(app.plugin, { name: 'authorify-websocket' });
    }
    return wsPlugin;
  }

  /**
   * Log the response
   *
   * @param {Object} err The error if occurred
   * @param {Object} res The response
   * @private
   * @ignore
   */
  function logResponse(err, res) {
    if (err || (res && !res.ok)) {
      if (err) {
        log.warn('%s on response -> read plaintext body due an error (%s)', app.name, err.message);
      } else {
        log.warn('%s on response -> read plaintext body due an error (%s)', app.name, res.error);
      }
    } else if (res && !_.isEmpty(res.body)) {
      if  (res.body[my.config.encryptedBodyName]) {
        log.info('%s on response -> read encrypted body', app.name);
      } else {
        log.info('%s on response -> read plaintext body', app.name);
      }
    }
  }

  /**
   *  Formats the name of the module loaded into the browser
   *
   *  @param module {String} The original module name
   *  @return {String} Name of the module
   *  @private
   *  @ignore
   */
  function getModuleName(module) {
    var script = module.replace(/[^a-zA-Z0-9]/g, '.'),
        parts = script.split('.'),
        name = parts.shift();

    if (parts.length) {
      for (var p in parts) {
        name += parts[p].charAt(0).toUpperCase() + parts[p].substr(1, parts[p].length);
      }
    }
    return name;
  }

  var Crypter = Class(mixin.WithCrypto, {
    constructor: function(opts) {
      opts = opts || {};
      this.setKey(opts.key);
      this.setCert(opts.cert);
      this.setCa(opts.ca);
    }
  });

  var Config = Class({
    constructor: function(initConfig) {
      var self = this;
      initConfig = getConfigOptions(initConfig);
      _.forEach(initConfig, function(value, key) {
        self[key] = value;
      });
      this.urlBase = util.format('%s://%s:%s', this.protocol, this.host, this.port);
      this.crypter = new Crypter({
        key : this.key,
        cert: this.cert,
        ca  : this.ca
      });
    }
  });

  // TODO: add option to use the last successful protocol used. Add also a timer to restore the default order; if the default first protocol fails again, set a new long timer (like primus reconnection strategy)
  var Client = Class({
    /**
     * The constructor
     *
     * @param {Object} [opts] The construction options
     * @param {Object} opts.name The name of the required configuration
     * @param {Object} opts.request The request object
     * @param {String} opts.path The required route
     * @param {String} opts.method = 'GET' The http verb
     * @param {Boolean} opts.plain = false True if the request body is in plaintext
     * @param {String} opts.transport = 'http' The transport protocol ('http' or 'ws')
     * @constructor
     * @ignore
     */
    constructor: function(opts) {
      opts = formatOptions(opts);
      my.setConfig(opts.name);
      var cfg = my.config,
          self = this;
      _.forEach(cfg, function(value, key) {
        self[key] = value;
      });
      if (opts.path) {
        opts.path = opts.path.urlSanify();
      }
      this.request   = opts.request;
      this.path      = opts.path;
      this.method    = opts.method || 'GET';
      this.plain     = opts.plain  || false;
    },
    /**
     * Create a new request
     *
     * @param {Header} header The header instance
     * @param {String} path The required route
     * @param {String} [method = 'GET'] The http verb
     * @param {String} [transport = 'http'] The transport protocol ('http' or 'ws')
     * @private
     */
    composeRequest: function(header, path, method, transport) {
      transport = transport || 'http';
      if (transport !== 'http' && transport !== 'ws') {
        throw new CError('unknown transport').log();
      }
      var plain = true,
          self = this;
      method = method || 'GET';
      // prepare request
      if (!this.request || this.path !== path || this.method !== method) {
        var url = util.format('%s%s', this.urlBase, path);
        if (transport === 'http') {
          this.request = agent(method, url);
          // set timeout for request
          if (this.requestTimeout && this.requestTimeout > 0) {
            this.request.timeout(this.requestTimeout);
          }
          // set content type
          this.request.type('json');
        } else {
          var ws = getWebsocketPlugin();
          if (!ws) {
            throw new CError('websocket plugin not loaded');
          }
          this.request = ws.wsclient.primusagent(method, url, {
            timeout: this.requestTimeout
          });
        }
      }
      if (!this.request) {
        throw new CError('no request available').log();
      }
      // set headers
      if (header) {
        this.headers[authHeaderKey] = header.encode();
        _.each(this.headers, function(value, key) {
          self.request.set(key, value);
        });
        plain = (header.getMode() === 'auth-plain');
      }
      // compose query if required
      if (this._pendingQuery) {
        _.forEach(this._pendingQuery, function(value) {
          if (plain || self._noAuthHeader) {
            if (!_.isObject(value)) {
              throw new CError('wrong query format').log();
            }
            self.request.query(value);
          } else {
            // encrypt query in Base64url
            if (!_.isObject(value)) {
              throw new CError('wrong query format').log();
            }
            _.forEach(value, function(item, property) {
              value[property] = header.encoder.encryptAes(item.toString(), header.getSecret(), 'url');
            });
            self.request.query(value);
          }
        });
      }
      // compose body if required
      if (this._pendingContent) {
        var content = {},
            _content = {};
        if (plain || this._noAuthHeader) {
          _.forEach(this._pendingContent, function(value) {
            if (!_.isObject(value)) {
              throw new CError('wrong body format').log();
            }
            self.request.send(value);
          });
          log.info('%s on request -> write plaintext body', app.name);
        } else {
          if (!header) {
            throw new CError('missing header').log();
          }
          _.forEach(this._pendingContent, function(value) {
            if (!_.isObject(value)) {
              throw new CError('wrong body format').log();
            }
            _.extend(_content, value);
          });
          content[my.config.encryptedBodyName] = header.cryptContent(_content);
          // sign the body
          if (my.config.signBody) {
            content[my.config.encryptedSignatureName] = header.generateSignature(_content);
          }
          log.info('%s on request -> write encrypted body', app.name);
          self.request.send(content);
        }
      }
    },
    /**
     * @inheritdoc #handshake
     */
    handshake: function(callback) {
      var handshake = new Handshake({
            key: my.config.key,
            cert: my.config.cert,
            encoderCert: my.config.cert
          });
      handshake.setToken(handshake.generateToken());
      this.composeRequest(handshake, this.handshakePath, 'GET', 'http');
      // perform request and process response
      this.request.end(function(err, res) {
        logResponse(err, res);
        if (err) {
          callback(err, res);
        } else if (!res.ok) {
          callback(null, res);
        } else {
          my.processHeader(res, function(err, result) {
            // save the received certificate
            if (!err) {
              var session = {
                sid: result.parsedHeader.payload.sid,
                cert: result.parsedHeader.payload.cert
              };
              sessionStore.save(my.config.urlBase, session, function(err) {
                if (!err) {
                  log.debug('%s saved session', app.name);
                  log.debug(session);
                  callback(null, result);
                } else {
                  log.error('%s %s', app.name, err);
                  callback(err, result);
                }
              });
            } else {
              log.error('%s %s', app.name, err);
              callback(err, result);
            }
          });
        }
      });
      return this;
    },
    /**
     * @inheritdoc #authenticate
     */
    authenticate: function(username, password, callback) {
      var self = this,
          err;
      if (!this.id || !this.app || !username || !password) {
        err = 'missing required fields for authentication';
        log.error('%s %s', app.name, err);
        callback(err);
      } else {
        sessionStore.load(my.config.urlBase, function(loadErr, session) {
          if (loadErr) {
            log.error('%s %s', app.name, loadErr);
            callback(loadErr);
          } else if (session){
            var authentication = new Authentication({
              key: my.config.key,
              cert: my.config.cert,
              encoderCert: session.cert,
              sid: session.sid,
              secret: my.generateSecret(),
              id: self.id,
              app: self.app,
              username: username,
              password: password
            });
            authentication.setToken(authentication.generateToken());
            self.composeRequest(authentication, self.authPath, 'GET', 'http');
            // perform request and process response
            self.request.end(function(err, res) {
              logResponse(err, res);
              if (err) {
                callback(err, res);
              } else if (!res.ok) {
                callback(null, res);
              } else {
                my.processHeader(res, function(procErr, result) {
                  if (!procErr) {
                    // save token into the session
                    // NOTE: the sid is changed
                    session.sid = result.parsedHeader.payload.sid;
                    session.token = result.parsedHeader.content.token;
                    sessionStore.save(my.config.urlBase, session, function(saveErr) {
                      if (!saveErr) {
                        log.debug('%s saved session', app.name);
                        log.debug(session);
                        callback(err, result);
                      } else {
                        err = 'save session error';
                        log.error('%s %s', app.name, err);
                        callback(err);
                      }
                    });
                  } else {
                    callback(procErr);
                  }
                });
              }
            });
          } else {
            err = 'session not found';
            log.error('%s %s', app.name, err);
            callback(err);
          }
        });
      }
      return this;
    },
    /**
     * Perform a request
     *
     * @param {String} transport = 'http' The transport protocol ('http' or 'ws')
     * @param {String} method = 'GET' The http verb
     * @param {String} path The required route
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doConnect: function (transport, method, path, callback) {
      if (transport === 'http' || transport === 'ws') {
        log.debug('%s perform a %s request', app.name, (transport === 'ws' ? 'websocket' : 'http'));
        this.composeRequest(null, path, method, transport);
        // perform request and process response
        this.request.end(function (err, res) {
          logResponse(err, res);
          callback(err, res);
//          if (err) {
//            callback(err, res);
//          } else if (!res.ok) {
//            callback(res.error, res);
//          } else {
//            callback(null, res);
//          }
        });
      } else {
        var err = 'unknown transport';
        log.error('%s %s %s', app.name, err, transport);
        callback(err);
      }
    },
    /**
     * A request without Authorization header
     *
     * @inheritdoc #authorize
     * @private
     */
    connect: function(opts) {
      opts = opts || {};
      var path = opts.path || this.path,
          callback = opts.callback,
          method = opts.method || this.method,
          ws = getWebsocketPlugin(),
          transports = app.config.transports,
          self = this,
          i = 0,
          error,
          response;

      if (ws) {
        if (transports && transports.length > 0) {
          async.whilst(
            function () {
              return (i < transports.length);
            },
            function (done) {
              self.doConnect(transports[i], method, path, function (err, res) {
                error = err;
                response = res;
                if (!err && res) {
                  i = transports.length;
                } else {
                  i++;
                  if (i < transports.length) {
                    delete self.request;
                  }
                }
                done();
              });
            },
            function (err) {
              callback(err || error, response);
            }
          );
        } else {
          error = 'no transport available';
          log.error('%s %s', app.name, error);
          callback(error);
        }
      } else {
        this.doConnect('http', method, path, callback);
      }
      return this;
    },
    /**
     * Perform a request
     *
     * @param {String} transport = 'http' The transport protocol ('http' or 'ws')
     * @param {String} method The required method
     * @param {String} path The required path
     * @param {Boolean} plain = false The required plain
     * @param {Object} header The header for the request
     * @param {Object} session The session
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doRequest:function (transport, method, path, plain, header, session, callback){
      var self = this,
          err;
      if (transport === 'http' || transport === 'ws') {
        log.debug('%s perform a %s request', app.name, (transport === 'ws' ? 'websocket' : 'http'));
        // compose request
        this.composeRequest(header, path, method, transport);
        // perform request and process response
        this.request.end(function(err, res) {
          logResponse(err, res);
          if (err) {
            callback(err, res);
//          } else if (!res.ok) {
//            callback(null, res);
          } else if (path === my.config.logoutPath) {
            // destroy local session
            sessionStore.destroy.call(sessionStore, my.config.urlBase);
            // the logout response does not have header
            callback(null, res);
          } else {
            my.processHeader(res, function(procErr, result) {
              // save the token
              if (!procErr) {
                // save token into the session
                session.token = result.parsedHeader.content.token;
                sessionStore.save(my.config.urlBase, session, function(saveErr) {
                  if (!saveErr) {
                    log.debug('%s saved session', app.name);
                    log.debug(session);
                    if (!(plain || self._noAuthHeader || path === my.config.logoutPath)) {
                      // decrypt body if present
                      res.body = my.decryptBody(result, header);
                    }
                    callback(err, result);
                  } else {
                    err = 'save session error';
                    log.error('%s %s', app.name, err);
                    callback(err);
                  }
                });
              } else {
                callback(procErr);
              }
            });
          }
        });
      } else {
        err = 'unknown transport';
        log.error('%s %s %s', app.name, err, transport);
        callback(err);
      }
    },
    /**
     * Perform a request
     *
     * @param {String} method The required method
     * @param {String} path The required path
     * @param {Boolean} plain = false The required plain
     * @param {Object} header The header for the request
     * @param {Object} session The session
     * @param {Function} callback The callback: next(err, res)
     * @param {Error/String} callback.err The error if occurred
     * @param {Object} callback.res The response received from the server
     * @private
     */
    doAuthorize: function (method, path, plain, header, session, callback) {
      var ws = getWebsocketPlugin(),
          self = this,
          transports = app.config.transports,
          i = 0,
          error,
          response;

      if (ws) {
        if (transports && transports.length > 0) {
          async.whilst(
            function() {
              return (i < transports.length);
            },
            function (done) {
              self.doRequest(transports[i], method, path, plain, header, session, function (err, res) {
                error = err;
                response = res;
                if (!err && res && res.ok) {
                  i = transports.length;
                } else {
                  i++;
                  if (i < transports.length) {
                    delete self.request;
                  }
                }
                done();
              });
            },
            function (err) {
              callback(err || error, response);
            }
          );
        } else {
          error = 'no transport available';
          log.error('%s %s', app.name, error);
          callback(error);
        }
      } else {
        this.doRequest('http', method, path, plain, header, session, callback);
      }
    },
    /**
     * @inheritdoc #authorize
     */
    authorize: function(opts) {
      if (this._noAuthHeader) {
        this.connect(opts);
      } else {
        opts = opts || {};
        var path = opts.path || this.path,
            callback = opts.callback,
            plain = (opts.plain || this.plain),
            mode = (plain ? 'auth-plain' : 'auth'),
            method = opts.method || this.method,
            self = this;
        sessionStore.load(my.config.urlBase, function(err, session) {
          if (err) {
            log.error('%s %s', app.name, err);
            callback(err);
          } else if (session){
            // if the client handle a wrong session the request is made without header because
            // the server was unable to destroy the relative session
            if (path === my.config.logoutPath && (!session.token || !session.sid)) {
              // destroy local session
              sessionStore.destroy.call(sessionStore, my.config.urlBase);
              // make a new request without authorization header
              self._noAuthHeader = true;
              self.connect(opts);
            } else if (!session.token) {
              err = 'missing authentication token';
              log.error('%s %s', app.name, err);
              callback(err);
            } else if (!session.sid) {
              err = 'missing sid';
              log.error('%s %s', app.name, err);
              callback(err);
            } else {
              var authorization = new Authorization({
                mode: mode,
                key: my.config.key,
                cert: my.config.cert,
                encoderCert: session.cert,
                sid: session.sid,
                secret: my.generateSecret(),
                token: session.token
              });
              self.doAuthorize(method, path, plain, authorization, session, callback);
            }
          } else {
            err = 'session not found';
            log.error('%s %s', app.name, err);
            callback(err);
          }
        });
      }
      return this;
    },
    /**
     * Complete a request and get the response from the server
     *
     * @chainable
     * @param {Function} callback The function executed after the server reply: callback(err, res)
     * @param {String} callback.err The error if occurred
     * @param {ServerResponse} callback.res The server response
     * @return {Client} The client instance
     */
    end: function(callback) {
      this.authorize({ callback: callback });
      return this;
    },
    /**
     * Compose a query-string
     *
     * ## Example
     *
     * To compose a query-string like "?format=json&data=here" in a GET request:
     *
     *        var client = require('authorify-client')({
     *          // set your options
     *        });
     *        client
     *          .get('/someroute')
     *          .query({ format: 'json' })
     *          .query({ data: 'here' })
     *          .end(function(err, res){
     *            // your logic
     *          });
     *
     * @chainable
     * @param {Object} value The object to compose the query
     * @return {Client} The client instance
     */
    query: function(value) {
      if (value) {
        if (config.encryptQuery) {
          this._pendingQuery = this._pendingQuery || [];
          this._pendingQuery.push(value);
        } else {
          this.request.query(value);
        }
      }
      return this;
    },
    /**
     * Add a body in a POST/PUT request
     *
     * ## Example
     *
     *        var client = require('authorify-client')({
     *          // set your options
     *        });
     *        client
     *          .post('/user')
     *          .send({ name: 'alex', surname: 'smith' })
     *          .end(function(err, res){
     *            // your logic
     *          });
     *
     * @param {Object} value The object to compose the body
     * @return {Client} The client instance
     */
    send: function(value) {
      if (value) {
        this._pendingContent = this._pendingContent || [];
        this._pendingContent.push(value);
      }
      return this;
    },
    /**
     * Abort the current request
     *
     * @chainable
     * @return {Client} The client instance
     */
    abort: function() {
      if (this.request) {
        this.request.abort();
      }
      return this;
    },
    /**
     * Do not add the Authorization header (for free routes)
     *
     * @chainable
     * @return {Client} The client instance
     */
    pass: function() {
      this._noAuthHeader = true;
      return this;
    }
  });

  /**
   * @inheritdoc node_modules.authorify_client.mixin.WithCrypto#generateSecret
   * @private
   */
  my.generateSecret = function() {
    return Crypter.generateSecret();
  };

  /**
   * Decrypt the body
   *
   * @param {ServerResponse} res The server response
   * @param {Header} header The header
   * @returns {Object} The decrypted body
   * @private
   */
  my.decryptBody = function(res, header) {
    var _body;
    if (res && res.body) {
      if (res.parsedHeader && header) {
        switch (res.parsedHeader.payload.mode) {
          case 'auth':
            if (_.isObject(res.body)) {
              if (res.body[my.config.encryptedBodyName]) {
                var _secretBackup = header.getSecret();
                var secret = header.keychain.decryptRsa(res.parsedHeader.payload.secret);
                // set secret of the server
                header.setSecret(secret);
                // decrypt the body
                _body = header.decryptContent(res.body[my.config.encryptedBodyName]);
                // verify the signature
                if (my.config.signBody) {
                  var signature = res.body[my.config.encryptedSignatureName];
                  if (!signature) {
                    throw new CError('missing signature').log();
                  }
                  var signVerifier = new Crypter({
                    cert: res.session.cert
                  });
                  if (!signVerifier.verifySignature(JSON.stringify(_body), signature)) {
                    throw new CError('forgery message').log();
                  }
                }
                header.setSecret(_secretBackup);
              } else {
                _body = res.body;
              }
            } else {
              throw new CError('wrong body format').log();
            }
            break;
          default:
            _body = res.body;
            break;
        }
      } else {
        throw new CError('missing response header').log();
      }
    }

    return _body;
  };

  /**
   * Parse the Authorization header and verify it
   *
   * @param {ServerResponse} res The server response
   * @param {Function} next The callback: next(err, res)
   * @param {String} next.err The error if occurred
   * @param {ServerResponse} next.res The server response
   * @private
   */
  my.processHeader = function(res, next) {
    var authHeader = res.headers[authHeaderKey.toLowerCase()] || '',
        senderCert,
        reqSid,
        reqToken;
    async.series([
      // parse header
      function(callback) {
        if (authHeader.length === 0) {
          callback('missing header');
        } else {
          res.parsedHeader = Header.parse(authHeader, my.config.key, my.config.cert);
          senderCert = res.parsedHeader.payload.cert;  // get the certificate in handshake
          reqSid = res.parsedHeader.payload.sid;
          reqToken = res.parsedHeader.content.token;
          callback(null);
        }
      },
      // get sender certificate using payload cert (in handshake phase) or payload sid
      function(callback) {
        if (res.parsedHeader.payload.mode === 'handshake') {
          res.session = {
            sid: reqSid,
            cert: senderCert,
            token: reqToken
          };
          callback(null);
        } else {
          var querySid;
          if (sessionStore instanceof Store || 'undefined' !== typeof window) {
            querySid = my.config.urlBase;
          } else {
            querySid = reqSid;
          }
          // load the session if exists
          sessionStore.load(querySid, function(err, session){
            if (err) {
              callback(err);
            } else if (session) {
              log.debug('%s loaded session', app.name);
              log.debug(session);
              res.session = session;
              callback(null);
            } else {
              callback('session expired');
            }
          });
        }
      },
      // verify certificate authenticity
      function(callback) {
        if (res.session && res.session.cert) {
          if (res.parsedHeader.payload.mode === 'handshake') {
            if (my.config.crypter.verifyCertificate(res.session.cert)) {
              callback(null);
            } else {
              callback('unknown certificate');
            }
          } else {
            callback(null);
          }
        } else {
          callback('wrong session');
        }
      },
      // verify signature using sender certificate
      function(callback) {
        if (!res.parsedHeader.signature) {
          callback('unsigned');
        } else {
          var signVerifier = new Crypter({
            cert: res.session.cert
          });
          if (signVerifier.verifySignature(JSON.stringify(res.parsedHeader.content), res.parsedHeader.signature)) {
            callback(null);
          } else {
            callback('forgery');
          }
        }
      },
      // verify the date
      function(callback) {
        if (parseInt(config.clockSkew, 10) > 0) {
          var now = new Date().toSerialNumber(),
              sent = res.parsedHeader.content.date;
          if ((now - sent) > config.clockSkew * 1000) {
            callback('date too old');
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }
    ], function(error) {
      if (error) {
        log.error('%s %s', app.name, error);
      }
      next(error, res);
    });
  };

  /**
   * Get the config by name
   *
   * @param {String} name The name of the config
   * @return {Config} The configuration
   */
  my.getConfig = function(name) {
    var cfg;
    if (name && _.isString(name)) {
      cfg = my.configs[name];
    }
    return cfg;
  };

  /**
   * Delete a non active configuration
   *
   * @chainable
   * @param {String} name The name of the configuration
   * @return {Client} The client instance
   */
  my.deleteConfig = function(name) {
    var err;
    if (name) {
      if (name === my.config.name) {
        throw new CError('unable to remove active configuration').log();
      }
      delete my.configs[name];
    }
    return this;
  };

  /**
   * Create a local config based on default config.
   *
   * ## Example
   *
   *        var client = require('authorify-client')({
   *          port: 3000
   *          // set other options
   *        });
   *        client
   *          .set({
   *            name: 'newconfig',
   *            port: 4000,
   *            headers: {
   *              'custom-header-1': 'value',
   *              'custom-header-2': 'value'
   *            }
   *          })
   *          .get('/someroute')
   *          .end(function(err, res){
   *            // your logic here
   *          });
   *
   *        console.log(client.configs.newconfig.port);  // it is 4000
   *        console.log(client.configs.config.port);     // it is 3000
   *        console.log(client.config.port);             // it is 4000 because newconfig is the active configuration
   *
   *        // switch to 'config' configuration
   *        client.set('config');
   *
   * @chainable
   * @param {Object/String} [opts] The init configuration options or the active config name using default values
   * @param {String} opts.name = 'config' The name of the configuration to activate, create or update
   * @param {String} opts.protocol The protocol for requests
   * @param {String} opts.host The host of the server
   * @param {Integer} opts.port The port of the server
   * @param {String} opts.key The client private RSA key
   * @param {String} opts.cert The client public X.509 cert
   * @param {String} opts.ca The Certification Authority certificate
   * @param {String} opts.handshakePath The route exposed by the server for the handshake phase
   * @param {String} opts.authPath The route exposed by the server for the authentication/authorization phases
   * @param {String} opts.logoutPath The route exposed by the server for the logout
   * @param {String} opts.id The id (uuid) assigned to the client
   * @param {String} opts.app The app (uuid) assigned to the application that the client want to use
   * @param {Object} opts.headers Additional headers
   * @param {Object} opts.encryptedBodyName The property name for the encrypted body value
   * @param {Integer} opts.requestTimeout Timeout in milliseconds for requests
   * @param {String} opts.SECRET The secret key used in hash operations
   * @param {String} opts.SECRET_CLIENT The key used in conjunction with SECRET to verify handshake token
   */
  my.setConfig = function(opts) {
    opts = formatOptions(opts);
    var name = opts.name,
        cfg = my.getConfig(name);
    if (cfg) {
      delete opts.name;
      if (_.isEmpty(opts)) {
        my.config = cfg;
      } else {
        // delete older configuration
        delete my.configs[name];
        // create new configuration
        opts.name = name;
        my.createNewConfig(opts);
        log.debug("%s updated configuration '%s'", app.name, name);
      }
    } else {
      my.createNewConfig(opts);
      log.debug("%s created new configuration '%s'", app.name, name);
    }

    return this;
  };

  /**
   * Create a new configuration
   *
   * @param {Object} opts Config options
   * @private
   * @ignore
   */
  my.createNewConfig = function(opts) {
    opts = getConfigOptions(opts);
    var name = opts.name;
    if (!(my.configs[name])) {
      my.configs[name] = new Config(opts);
    }
    my.config = my.configs[name];
  };

  /**
   * Perform a handshake request
   *
   * @chainable
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.handshake = function(callback) {
    var _client = new Client();
    _client.handshake(callback);
    return _client;
  };

  /**
   * Perform an authentication request
   *
   * @chainable
   * @param {String} username The username for interactive login
   * @param {String} password The password for interactive login
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.authenticate = function(username, password, callback) {
    var _client = new Client();
    _client.authenticate(username, password, callback);
    return _client;
  };

  /**
   * Perform an authorize request
   *
   * @chainable
   * @param {Object} opts The options for authorization
   * @param {String} opts.path The required route
   * @param {String} [opts.method = 'GET'] The http verb
   * @param {Boolean} [opts.plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} opts.callback.err The error if occurred
   * @param {ServerResponse} opts.callback.res The server response
   * @return {Client} The client instance
   */
  my.authorize = function(opts) {
    var _client = new Client();
    _client.authorize(opts);
    return _client;
  };

  /**
   * Create a new client agent to request a route
   *
   * @chainable
   * @param {String} [method = 'GET'] The http verb
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   * @private
   */
  my.createClient = function(method, path, plain, callback) {
    var opts = fixRequestOptions(method, path, plain, callback);
    _.extend(opts, my.config);
    var _client = new Client(opts);
    if (opts.callback) {
      _client.end(opts.callback);
    }
    return _client;
  };

  /**
   * Perform a login action (handshake + authentication). Note that the required 'id' and 'app' are
   * defined into the active configuration.
   *
   * @chainable
   * @param {String} username The username for interactive login
   * @param {String} password The password for interactive login
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.login = function( username, password, callback) {
    var _client = my.handshake(function(err, res) {
      if (!err) {
        _client.authenticate(username, password, callback);
      } else {
        callback(err, res);
      }
    });
    return _client;
  };

  /**
   * Perform a logout request
   *
   * @chainable
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.logout = function(callback) {
    if (!callback) {
      callback = function() {};
    }
    return my.get(my.config.logoutPath, callback);
  };

  /**
   * Destroy the session for the required or active configuration.
   *
   * @param {String} name The config name
   * @return {Client} The client instance
   * @chainable
   */
  my.destroySession = function(name) {
    name = name || defaultConfigName;
    sessionStore.destroy(my.configs[name].urlBase);
    return this;
  };

  /**
   * Perform a GET request
   *
   * @method get
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.get = function(path, plain, callback) {
    return my.createClient('GET', path, plain, callback);
  };

  /**
   * Perform a POST request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.post = function(path, plain, callback) {
    return my.createClient('POST', path, plain, callback);
  };

  /**
   * Perform a PUT request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.put = function(path, plain, callback) {
    return my.createClient('PUT', path, plain, callback);
  };

  /**
   * Perform a DELETE request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.del = function(path, plain, callback) {
    return my.createClient('DELETE', path, plain, callback);
  };

  /**
   * Perform a HEAD request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.head = function(path, plain, callback) {
    return my.createClient('HEAD', path, plain, callback);
  };

  /**
   * Perform a PATCH request
   *
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.patch = function(path, plain, callback) {
    return my.createClient('PATCH', path, plain, callback);
  };

  /**
   * Perform a OPTIONS request
   *
   * @method options
   * @chainable
   * @param {String} path The required route
   * @param {Boolean} [plain = false] True if the request body is in plaintext
   * @param {Function} callback The function executed after the server reply: callback (err, res)
   * @param {String} callback.err The error if occurred
   * @param {ServerResponse} callback.res The server response
   * @return {Client} The client instance
   */
  my.options = function(path, plain, callback) {
    return my.createClient('OPTIONS', path, plain, callback);
  };

  /**
   * @method opts
   * @chainable
   * @inheritdoc #options
   */
  my.opts = my.options;

  /**
   * Load a plugin module to add some functionality.
   *
   * ## Example
   *
   *      var authorify = require('authorify-client')({
   *        // add your options
   *      });
   *      authorify.load('pluginname', 'shortname', opts);  // opts is an optional object to configure the plugin
   *      var loadedPlugin = authorify.plugin['shortname'];
   *      // below you can use all methods/properties exported by the plugin (loadedPlugin)
   *
   * @param {String} name The name of the plugin. THe plugin must be installed into the
   * application folder that uses the authorify module.
   * @param {String} [shortname] An optional short name for the plugin loaded as property in the root application
   * (authorify.plugin['shortname']).
   * @param {Object} [opts] The options required by the plugin.
   */
  my.load = function(name, shortname, opts) {
    if (_.isObject(shortname)) {
      opts = shortname;
      shortname = name;
    } else if (!shortname) {
      shortname = name;
    }
    opts = opts || {};
    var plugin;
    if ('undefined' === typeof window) {
      plugin = require(name)(app, opts);
    } else {
      name = getModuleName(name);
      plugin = window[name](app, opts);
    }
    if (plugin) {
      my.plugin[shortname] = plugin;
      log.info('%s plugin %s loaded with name %s', app.name, name, shortname);
    } else {
      log.error('%s plugin %s not loaded', app.name, name);
    }
  };

  /**
   * A crypter class
   *
   * @private
   */
  my.Crypter = Crypter;

  // init config
  my.setConfig();

  return my;
};
