/**
 * The authorization header.
 *
 * @class node_modules.authorify_client.class.Authorization
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

  var Header = app.class.Header,
      Class  = app.jsface.Class,
      errors = app.errors;

  var CError = errors.InternalError,
      mode1 = 'auth',
      mode2 = 'auth-plain'; // use auth-plain if you want body in plain text

  return Class(Header, {
    /**
     * The constructor
     *
     * @param {Object} config The config options
     * @param {Boolean} [config.reply = false] True if the header if of a server reply
     * @param {String} [config.mode = 'auth'] The mode of the header.
     *
     * Values:
     * - 'auth': encrypt body if present
     * - 'auth-plain': the body (if present) is in plaintext
     * @param {String} config.sid The session identifier
     * @param {Date} config.date The date
     * @param {String} config.key The private RSA key
     * @param {String} config.cert The public X.509 cert
     * @param {String} config.encoderCert The public X.509 cert of the encoder and signer of the header
     * @param {String} config.secret The secret AES shared key in Base64 format
     * @param {String} config.token The authentication token
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = config.mode || mode1;
      this.setSecret(config.secret);
      this.setToken(config.token);
      Header.call(this, config);
    },
    /**
     * Set the token
     *
     * @param {String} token The token
     */
    setToken: function(token) {
      this._token = token;
    },
    /**
     * Get the token
     *
     * @return {String} The token
     */
    getToken: function() {
      return this._token;
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
      if (this.getMode() !== mode1 && this.getMode() !== mode2) {
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
        token: this.getToken()
      };
      if (!out.date) {
        throw new CError('missing date').log();
      }
      if (!out.token) {
        throw new CError('missing token').log();
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
      return JSON.parse(this.keychain.decryptAes(data, this.getSecret()));
    }
  });
};