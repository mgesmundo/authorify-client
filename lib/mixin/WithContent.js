/**
 * A mixin class with useful properties.
 *
 * @class node_modules.authorify_client.mixin.WithContent
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

  var _      = app._,
      forge  = app.config.crypto,
      Class  = app.jsface.Class,
      SECRET = app.config.SECRET,
      errors = app.errors;

  var CError = errors.InternalError;

  return Class({
    /**
     * Set the date
     * @param {Date/Integer} date The date as date or number of milliseconds. The date is anyhow saved as integer.
     */
    setDate: function(date) {
      if (_.isDate(date)) {
        this._date = date.toSerialNumber();
      } else if (_.isNumber(date)) {
        this._date = date;
      } else {
        throw new CError('wrong date type').log();
      }
    },
    /**
     * Get the date
     * @return {Integer} The date in milliseconds
     */
    getDate: function() {
      return this._date;
    },
    /**
     * Set the token
     * @param {String} token The token in Base64 format
     */
    setToken: function(token) {
      if (token) {
        if (token.isBase64()) {
          this._token = token;
        } else {
          throw new CError('token not valid').log();
        }
      }
    },
    /**
     * Get the token
     * @return {String} The token in Base64 format
     */
    getToken: function() {
      return this._token;
    },
    /**
     * Set the id if the client
     * @param {String} id The id of the client as uuid string
     */
    setId: function(id) {
      if (id) {
        if (id.isUuid()) {
          this._id = id;
        } else {
          throw new CError('id not valid').log();
        }
      }
    },
    /**
     * Get the id of the client
     * @return {String} The id of the client as uuid string
     */
    getId: function() {
      return this._id;
    },
    /**
     * Set the app used by the client
     * @param {String} app The app used by the client as uuid string
     */
    setApp: function(app) {
      if (app) {
        if (app.isUuid()) {
          this._app = app;
        } else {
          throw new CError('app not valid').log();
        }
      }
    },
    /**
     * Get the app used by the client
     * @return {String} The app used by the client as uuid string
     */
    getApp: function() {
      return this._app;
    },
    /**
     * Set the username for interactive login
     * @param {String} username The username for the login
     */
    setUsername: function(username) {
      if (username) {
        this._username = username;
      }
    },
    /**
     * Get the username
     * @return {String} The username for the login
     */
    getUsername: function() {
      return this._username;
    },
    /**
     * Set the password for interactive login
     * @param {String} password The password for the login
     */
    setPassword: function(password) {
      // empty password not allowed
      if (password) {
        var hmac = forge.hmac.create();
        hmac.start('sha256', SECRET);
        hmac.update(password);
        this._password = password;
        this._passwordHash = hmac.digest().toHex();
      }
    },
    /**
     * Get the password
     * @return {String} The password for the login
     */
    getPassword: function() {
      return this._password;
    },
    /**
     * Verify the password
     * @param {String} password The password to verify
     * @return {Boolean} True if the password match the password used in login phase (the verify is based on SHA256 digest)
     */
    verifyPassword: function(password) {
      if (password) {
        var hmac = forge.hmac.create();
        hmac.start('sha256', SECRET);
        hmac.update(password);
        return hmac.digest().toHex() === this._passwordHash;
      }
      return false;
    }
  });
};