/**
 * The authentication header.
 *
 * @class node_modules.authorify_client.class.Authentication
 * @extends node_modules.authorify_client.class.Header
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

  var Header        = app.class.Header,
      Class         = app.jsface.Class,
      forge         = app.config.crypto,
      SECRET        = app.config.SECRET,
      SECRET_CLIENT = app.config.SECRET_CLIENT,
      SECRET_SERVER = app.config.SECRET_SERVER,
      errors        = app.errors;

  var CError = errors.InternalError,
      mode = 'auth-init';

  return Class(Header, {
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @param {String} config.secret The secret AES shared key in Base64 format
     * @param {String} config.id The id (uuid) assigned to the client
     * @param {String} config.app The app (uuid) assigned to the application that the client want to use
     * @param {String} config.username The username for the browser login
     * @param {String} config.password The password for the browser login
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = mode;
      this.setSecret(config.secret);
      this.setId(config.id);
      this.setApp(config.app);
      this.setUsername(config.username);
      this.setPassword(config.password);
      Header.call(this, config);
    },
    /**
     * Generate a new token
     *
     * @returns {String} The generated token
     */
    generateToken: function() {
      var cert;
      try {
        cert = this.keychain.getCertPem();
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'missing certificate',
            cause: e
          }
        }).log('body');
      }
      if (!cert) {
        throw new CError('missing certificate').log();
      }
      if (!this.getDate()) {
        throw new CError('missing date').log();
      }
      if (!this.getSid()) {
        throw new CError('missing session identifier').log();
      }
      if (!this.getId()) {
        throw new CError('missing id').log();
      }
      if (!this.getApp()) {
        throw new CError('missing app').log();
      }
      var tmp = this.getDate() + '::' + cert +'::' + this.getSid() + '::' + this.getId() + '::' + this.getApp() + '::';
      if (this._reply) {
        // NOTE: username is not mandatory in non browser environment
        // NOTE: SECRET_SERVER is present only when the client is used inside the authorify module
        var username = this.getUsername();
        if (!username) {
          username = 'anonymous';
        }
        var password = this.getPassword();
        if (!password) {
          password = forge.util.encode64(forge.random.getBytesSync(16));
        }
        tmp += username + '::' + password + '::' + SECRET_SERVER;
      } else {
        tmp += SECRET_CLIENT;
      }
      var hmac = forge.hmac.create();
      hmac.start('sha256', SECRET);
      hmac.update(tmp);
      return hmac.digest().toHex();
    },
    /**
     * Get the payload property of the header.
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      var secret;
      if (!this.getSecret()) {
        throw new CError('missing secret').log();
      }
      try {
        secret = this.encoder.encryptRsa(this.getSecret());
      } catch (e) {
        throw new CError({
          body: {
            code: 'ImATeapot',
            message: 'unable to encrypt secret',
            cause: e
          }
        }).log('body');
      }
      if (this.getMode() !== mode) {
        throw new CError('unexpected mode').log();
      }
      if (!this.getSid()) {
        throw new CError('missing sid').log();
      }
      return {
        mode: this.getMode(),
        secret: secret,
        sid: this.getSid()
      };
    },
    /**
     * Get the content property of the header
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      var out = {
        date: this.getDate(),
        token: this.getToken(),
        id: this.getId(),
        app: this.getApp()
      };
      if (!out.date) {
        throw new CError('missing date').log();
      }
      if (!out.token) {
        throw new CError('missing token').log();
      }
      if (!out.id) {
        throw new CError('missing id').log();
      }
      if (!out.app) {
        throw new CError('missing app').log();
      }
      if (!this._reply) {
        out.username = this.getUsername();
        out.password = this.getPassword();
      }

      return out;
    },
    /**
     * Encrypt data or content
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      if (!data) {
        data = this.getContent();
      }
      return this.encoder.encryptAes(JSON.stringify(data), this.getSecret());
    },
    /**
     * Decrypt content.
     *
     * @param {String} The data to decrypt
     * @return {Object} The decrypted result
     */
    decryptContent: function(data) {
      if (!(data && 'function' === typeof data.isBase64 && data.isBase64())) {
        throw new CError('wrong data format to decrypt').log();
      }
      return JSON.parse(this.encoder.decryptAes(data, this.getSecret()));
    }
  });
};