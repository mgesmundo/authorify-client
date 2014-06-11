/**
 * A mixin class with encryption features.
 *
 * @class node_modules.authorify_client.mixin.WithCrypto
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

  var forge     = app.config.crypto,
      base64url = app.base64url,
      Class     = app.jsface.Class,
      errors    = app.errors,
      pki       = forge.pki,
      caStore   = pki.createCaStore(),
      SCHEME    = 'RSA-OAEP',
      MODE      = 'CTR';

  var CError = errors.InternalError;

  return Class({
    $statics: {
      /**
       * Get bytes from a secret key
       *
       * @param {String} secret The secret in Base64 format
       * @return {Bytes} The secret bytes
       * @static
       * @private
       */
      getBytesFromSecret: function(secret) {
        var keyIv;
        if (!secret) {
          throw new CError('missing secret').log();
        }
        // secret is a Base64 string
        if(secret.isBase64()){
          try {
            keyIv = forge.util.decode64(secret);
          } catch (e) {
            throw new CError('secret not valid').log();
          }
        } else {
          keyIv = secret;
        }
        return keyIv;
      },
      /**
       * Generate a new secret key
       *
       * @return {String} The secret in Base64 format
       * @static
       */
      generateSecret: function() {
        return forge.util.encode64(forge.random.getBytesSync(16));
      }
    },
    /**
     * Set the private RSA key
     * @param {String} pem The private RSA key in pem format
     */
    setKey: function(pem) {
      if (pem) {
        this._key = pki.privateKeyFromPem(pem);
      }
    },
    /**
     * Get the private RSA key in native format
     * @return {String} The private RSA key
     */
    getKey: function() {
      return this._key;
    },
    /**
     * Get the private RSA key in pem format
     * @return {String} The private RSA key
     */
    getKeyPem: function() {
      return pki.privateKeyToPem(this._key).newLineSanify();
    },
    /**
     * Set the X.509 certificate
     * @param {String} pem The X.509 certificate in pem format
     */
    setCert: function(pem) {
      if (pem) {
        this._cert = pki.certificateFromPem(pem);
      }
    },
    /**
     * Get the X.509 certificate in native format
     * @return {String} The X.509 certificate
     */
    getCert: function() {
      return this._cert;
    },
    /**
     * Get the X.509 certificate in pem format
     * @return {String} The X.509 certificate
     */
    getCertPem: function() {
      return pki.certificateToPem(this._cert).newLineSanify();
    },
    /**
     * Set the CA certificate
     * @param {String} pem The CA certificate in pem format
     */
    setCa: function(pem) {
      if (pem) {
        this._ca = pki.certificateFromPem(pem);
        caStore.addCertificate(this._ca);
      }
    },
    /**
     * Get the CA certificate in native format
     * @return {String} The CA certificate
     */
    getCa: function() {
      return this._ca;
    },
    /**
     * Get the CA certificate in pem format
     * @return {String} The CA certificate
     */
    getCaPem: function() {
      return pki.certificateToPem(this._ca).newLineSanify();
    },
    /**
     * Encrypt data using RSA public key inside the X.509 certificate
     * @param {String} data The data to encrypt
     * @param {String} [scheme='RSA-OAEP'] The scheme to be used in encryption.
     * Use 'RSAES-PKCS1-V1_5' in legacy applications.
     * @return {String} The RSA encryption result in Base64
     */
    encryptRsa: function (data, scheme) {
      // scheme = RSA-OAEP, RSAES-PKCS1-V1_5
      scheme = scheme || SCHEME;
      return forge.util.encode64(this._cert.publicKey.encrypt(data, scheme));
    },
    /**
     * Decrypt RSA encrypted data
     * @param {String} data The data to decrypt
     * @param {String} [scheme='RSA-OAEP'] The mode to use in decryption. 'RSA-OAEP', 'RSAES-PKCS1-V1_5' are allowed schemes.
     * @return {String} The decrypted data
     */
    decryptRsa: function (data, scheme) {
      scheme = scheme || SCHEME;
      return this._key.decrypt(forge.util.decode64(data), scheme);
    },
    /**
     * Encrypt data using AES cipher
     * @param {String} data The data to encrypt
     * @param {Bytes} secret The secret to use in encryption
     * @param {String} [encoder = 'base64'] base64 or url final encoding
     * @param {String} [mode = 'CTR'] The mode to use in encryption. 'CBC', 'CFB', 'OFB', 'CTR' are allowed modes.
     * @return {String} The AES encryption result in Base64
     */
    encryptAes: function (data, secret, encoder, mode) {
      // mode = CBC, CFB, OFB, CTR
      mode = mode || MODE;
      var keyIv = this.getBytesFromSecret(secret);
      var cipher = forge.aes.createEncryptionCipher(keyIv, mode);
      cipher.start(keyIv);
      cipher.update(forge.util.createBuffer(data));
      cipher.finish();
      if (encoder === 'url') {
        return base64url(cipher.output.data);
      }
      return forge.util.encode64(cipher.output.data);
    },
    /**
     * Decrypt AES encrypted data
     * @param {String} data The data to decrypt
     * @param {String} secret The secret to use in decryption in Base64 format
     * @param {String} [encoder = 'base64'] base64 or url encoding
     * @param {String} [mode='CTR'] The mode to use in decryption. 'CBC', 'CFB', 'OFB', 'CTR' are allowed modes.
     * @return {String} The decrypted data
     */
    decryptAes: function (data, secret, encoder, mode) {
      // mode = CBC, CFB, OFB, CTR
      mode = mode || MODE;
      var keyIv = this.getBytesFromSecret(secret);
      var cipher = forge.aes.createDecryptionCipher(keyIv, mode);
      cipher.start(keyIv);
      var decoded;
      if (encoder === 'url') {
        decoded = base64url.decode(data);
      } else {
        decoded = forge.util.decode64(data);
      }
      cipher.update(forge.util.createBuffer(decoded));
      cipher.finish();
      return cipher.output.data;
    },
    /**
     * Create a signature (RSA-SHA1) for the message
     * @param {String} message The message to sign
     * @returns {String} The signature in Base64
     */
    sign: function (message) {
      var md = forge.md.sha1.create();
      md.update(message, 'utf8');
      return forge.util.encode64(this._key.sign(md));
    },
    /**
     * Verify a signature (RSA-SHA1) for the message
     * @param {String} message The message signed
     * @param {String} signature The signature of the message in Base64 format
     * @returns {Boolean} True is the signature is successful verified
     */
    verifySignature: function (message, signature) {
      var md = forge.md.sha1.create();
      md.update(message, 'utf8');
      try {
        return this._cert.publicKey.verify(md.digest().bytes(), forge.util.decode64(signature));
      } catch (e) {
        return false;
      }
    },
    /**
     * Verify that a X.509 certificate is generated by the CA
     * @param {String} pem The certificate to verify in pem format
     * @returns {Boolean} True if the X.509 certificate is original
     */
    verifyCertificate: function (pem) {
      var certificate = forge.pki.certificateFromPem(pem);
      var issuerCert = caStore.getIssuer(certificate);
      if (issuerCert) {
        try {
          return issuerCert.verify(certificate);
        } catch (e) {
          return false;
        }
      }
      return false;
    }
  });
};
