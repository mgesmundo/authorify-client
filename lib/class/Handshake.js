/**
 * The handshake header.
 *
 * @class node_modules.authorify_client.class.Handshake
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
      forge         = app.config.crypto,
      Class         = app.jsface.Class,
      SECRET        = app.config.SECRET,
      SECRET_CLIENT = app.config.SECRET_CLIENT,
      errors        = app.errors;

  var CError = errors.InternalError;

  var mode = 'handshake';

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
     * @constructor
     */
    constructor: function(config) {
      config = config || {};
      config.mode = mode;
      Header.call(this, config);
    },
    /**
     * Generate a valid token
     *
     * @returns {String} The token
     */
    generateToken: function() {
      var cert = this.keychain.getCertPem();
      if (!cert) {
        throw new CError('missing certificate').log();
      }
      var tmp = this.getDate() + '::' + cert + '::' + SECRET_CLIENT;
      var hmac = forge.hmac.create();
      hmac.start('sha256', SECRET);
      hmac.update(tmp);
      return hmac.digest().toHex();
    },
    /**
     * Get the payload property of the header
     *
     * @return {Object} The payload property of the header
     */
    getPayload: function() {
      if (this.getMode() !== mode) {
        throw new CError('unexpected mode').log();
      }
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
      var out = {
        mode: this.getMode(),
        cert: cert
      };
      if (this.getSid()) {
        out.sid = this.getSid();
      }
      return out;
    },
    /**
     * Get the content property of the header
     *
     * @return {Object} The content property of the header
     */
    getContent: function() {
      if (!this.getDate()) {
        throw new CError('missing date').log();
      }
      return {
        date: this.getDate(),
        token: this.getToken()
      };
    },
    /**
     * Encrypt data or content.
     *
     * @param {Object} [data] The data to encrypt or content if missing
     * @return {String} The encrypted result in Base64 format
     */
    cryptContent: function(data) {
      if (!data) {
        data = this.getContent();
      }
      return data;
    },
    /**
     * Decrypt data.
     *
     * @param {String} The data to decrypt and assign to content
     * @return {Object} The decrypted content
     */
    decryptContent: function(data) {
      return data;
    }
  });
};