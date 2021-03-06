/**
 * The configuration.
 *
 * @class node_modules.authorify_client
 *
 * @author Marcello Gesmundo
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

  // dependencies
  var _          = require('underscore'),
      iDate      = require('internet-timestamp'),
      superagent = require('superagent'),
      async      = require('async'),
      util       = require('util'),
      base64url  = require('base64url'),
      Store      = app.class.Store;

  // namespace
  var my = {};

  my.config = {
    /**
     * @ignore
     * @private
     */
    name: 'authorify client',
    /**
     * @cfg {Object} [logger = console] The logger. It MUST have
     * log, error, warn, info, debug methods
     */
    logger: console, // for best logging please use winston (node environment): npm install winston
    /**
     * @cfg {Object} crypto Cryptographic engine
     */
    crypto: undefined,
    /**
     * @cfg {String} cert The client X.509 certificate in pem format
     */
    cert: undefined,
    /**
     * @cfg {String} key The client private RSA key in pem format
     */
    key: undefined,
    /**
     * @cfg {String} ca The Certification Authority certificate in pem format
     */
    ca: undefined,
    /**
     * @cfg {Object} sessionStore The store for the sessions
     */
    sessionStore: undefined,
    /**
     * @cfg {String} SECRET The secret key used in hash operations
     */
    SECRET: 'secret',  // use your own SECRET!
    /**
     * @cfg {String} SECRET_CLIENT The key used in conjunction with SECRET to verify handshake token
     */
    SECRET_CLIENT: 'secret_client',  // use your own SECRET_CLIENT,
    /**
     * @cfg {String} encryptedBodyName = 'ncryptdbdnm' The property name for the encrypted body value
     */
    encryptedBodyName: 'ncryptdbdnm',
    /**
     * @cfg {String} encryptedSignatureName = 'ncryptdsgnnm' The property name for the signature value of the body
     */
    encryptedSignatureName: 'ncryptdsgnnm',
    /**
     * @cfg {Boolean} signBody = true Sign the body when it is sent encrypted
     */
    signBody: true,
    /**
     * @cfg {Boolean} encryptQuery = true Encrypt the values in url query string
     */
    encryptQuery: true,
    /**
     * @cfg {String} authHeader='Authorization' The header used for authentication and authorization
     */
    authHeader: 'Authorization',
    /**
     * @cfg {String} protocol='http' The protocol for requests
     */
    protocol: 'http',
    /**
     * @cfg {String} host='localhost' The host of the server
     */
    host: 'localhost',
    /**
     * @cfg {Integer} port=3000 The port of the server
     */
    port: 3000,
    /**
     * @cfg {String} handshakePath='/handshake' The route exposed by the server for the handshake phase
     */
    handshakePath: '/handshake',
    /**
     * @cfg {String} authPath='/auth' The route exposed by the server for the authentication/authorization phases
     */
    authPath: '/auth',
    /**
     * @cfg {String} logoutPath='/logout' The route exposed by the server for the logout
     */
    logoutPath: '/logout',
    /**
     * @cfg {Integer} requestTimeout=10000 Timeout in milliseconds for requests
     */
    requestTimeout: 10000, // 10s
    /**
     * @cfg {Integer} clockSkew=0 Max age (in seconds) of the request/reply.
     * Every request must have a valid response within clockSkew seconds.
     * Note: you must enable a NTP server both on client and server. Set 0 to disable date check or 300 like Kerberos.
     */
    clockSkew: 0,
    /**
     * @cfg {String} id The id (uuid) assigned to the client
     */
    id: undefined,
    /**
     * @cfg {String} app The app (uuid) assigned to the application that the client want to use
     */
    app: undefined
  };

  // merge app.config with default config
  app.config = _.extend(my.config, app.config);

  if (!app.config.sessionStore) {
    app.config.sessionStore = new Store('session');
  }

  // empty function
  var emptyFn = function() {};

  if (app.config.logger) {
    if ('function' !== typeof app.config.logger.debug) {
      // console does not have debug method
      app.config.logger.debug = app.config.logger.log;
    }
  } else {
    app.config.logger = {
      debug: emptyFn,
      log: emptyFn,
      warn: emptyFn,
      error: emptyFn,
      info: emptyFn
    };
  }

  app.name = app.config.name;
  app._ = _;
  app.async = async;
  app.iDate = iDate;
  app.base64url = base64url;
  app.superagent = superagent;
  app.util = util;
  app.logger = app.config.logger;
  app.sessionStore = app.config.sessionStore;

  app.logger.info('%s default config loaded', app.name);

  return app;
};
