/**
 * The base class for all headers
 *
 * @class node_modules.authorify_client.class.Header
 * @mixins node_modules.authorify_client.mixin.WithPayload
 * @mixins node_modules.authorify_client.mixin.WithContent
 * @inheritable
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

  var mixin  = app.mixin,
      Class  = app.jsface.Class,
      forge  = app.config.crypto,
      config = app.config,
      log    = app.logger,
      errors = app.errors,
      debug  = app.config.debug;

  var CError = errors.InternalError;

  var Crypter = Class([mixin.WithCrypto], {
    constructor: function(opts) {
      opts = opts || {};
      this.setKey(opts.key);
      this.setCert(opts.cert);
    }
  });

  return Class([mixin.WithPayload, mixin.WithContent], {
    $statics: {
      /**
       * Parse the Authorization header
       *
       * @param {String} header The Authorization header in Base64 format
       * @param {String} key The private RSA key
       * @param {String} cert The public X.509 certificate
       * @return {Object} The parsed header
       * @static
       */
      parse: function(header, key, cert) {
        var parsedHeader;
        if (header) {
          if (!header.isBase64()) {
            throw new CError('missing header or wrong format').log();
          } else {
            parsedHeader = JSON.parse(forge.util.decode64(header));
            this.isModeAllowed.call(this, parsedHeader.payload.mode);
          }
          var Handshake      = app.class.Handshake,
              Authentication = app.class.Authentication,
              Authorization  = app.class.Authorization,
              mode           = parsedHeader.payload.mode,
              sid            = parsedHeader.payload.sid,
              result         = {};

          var options = {
            sid: sid,
            key: key || config.key,
            cert: cert || config.cert
          };
          switch (mode) {
            case 'handshake':
              result.header = new Handshake(options);
              break;
            case 'auth-init':
              result.header = new Authentication(options);
              break;
            default :
              result.header = new Authorization(options);
              break;
          }
          try {
            var ecryptedSecret = parsedHeader.payload.secret;
            if (ecryptedSecret) {
              var secret = result.header.keychain.decryptRsa(ecryptedSecret);
              result.header.setSecret(secret);
            }
            parsedHeader.content = result.header.decryptContent(parsedHeader.content);
          } catch (e) {
            throw new CError({
              body: {
                code: 'ImATeapot',
                message: 'unable to decrypt content',
                cause: e
              }
            }).log('body');
          }

          delete result.header;

          if (debug) {
            log.debug('%s parsed header', app.name);
            log.debug(parsedHeader);
          }
        }
        return parsedHeader;
      }
    },
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} [config.mode = 'auth'] The mode of the header. See {@link node_modules.authorify_client.mixin.WithPayload#MODES allowed modes}.
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      this._reply = config.reply || false;
      this.setMode(config.mode || 'auth');
      this.setSid(config.sid);
      this.setDate(config.date || new Date());
      this.keychain = new Crypter({
        key : config.key,
        cert: config.cert
      });
      this.encoder = new Crypter({
        cert: config.encoderCert
      });
    },
    /**
     * Set the secret shared key for AES encryption/decryption
     *
     * @param {String} secret The secret shared key in Base64 format
     */
    setSecret: function(secret) {
      if (secret) {
        this._secret = Crypter.getBytesFromSecret(secret);
      }
    },
    /**
     * Get the secret shared key for AES encryption/decryption
     *
     * @return {Bytes} The secret shared AES key
     */
    getSecret: function() {
      return this._secret;
    },
    /**
     * Get the payload property of the header. You MUST override into subclasses.
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      throw new CError('you must override getPayload method').log();
    },
    /**
     * Get the content property of the header. You MUST override into subclasses.
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      throw new CError('you must override getContent method').log();
    },
    /**
     * Generate a signature for for data or content property
     *
     * @param {String/Object} data The data to sign or content if missing
     * @return {String} The signature in Base64 format
     */
    generateSignature: function(data) {
      try {
        data = data || this.getContent();
        return this.keychain.sign(JSON.stringify(data));
      } catch(e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'unable to sign content',
            cause: e
          }
        }).log('body');
      }
    },
    /**
     * Encrypt data or content. You MUST override into subclasses.
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      throw new CError('you must override cryptContent method').log();
    },
    /**
     * Decrypt content. You MUST override into subclasses.
     *
     * @param {String} The data to decrypt and assign to content
     * @return {Object} The decrypted result
     */
    decryptContent: function(data) {
      throw new CError('you must override decryptContent method').log();
    },
    /**
     * Encode the header including payload, content and signature
     *
     * @return {String} The encoded header in Base64 format
     */
    encode: function() {
      var content = this.getContent();
      var out = {
        payload: this.getPayload(),
        content: this.cryptContent(content),
        signature: this.generateSignature()
      };
      if (debug) {
        log.debug('%s encode with sid %s', app.name, out.payload.sid);
        log.debug('%s encode with token %s', app.name, content.token);
      }

      return forge.util.encode64(JSON.stringify(out));
    }
  });
};