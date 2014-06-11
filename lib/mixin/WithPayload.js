/**
 * A mixin class with useful properties.
 *
 * @class node_modules.authorify_client.mixin.WithPayload
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

  var Class  = app.jsface.Class,
      errors = app.errors;

  var CError = errors.InternalError;

  return Class({
    $statics: {
      /**
       * Array of enabled modes
       * @property {Array}
       * @static
       */
      MODES: ['handshake', 'auth-init', 'auth', 'auth-plain'],
      /**
       * Verify if a mode is allowed
       * @method
       * @param {String} mode The mode to verify
       * @return {Boolean} True if the mode is allowed
       * @static
       */
      isModeAllowed: function(mode) {
        if (this.MODES.indexOf(mode) === -1) {
          throw new CError('not allowed payload mode').log();
        }
        return true;
      }
    },
    /**
     * Set the mode
     * @param {String} mode The mode.
     */
    setMode: function(mode) {
      this.isModeAllowed.call(this, mode);
      this._mode = mode;
    },
    /**
     * Get the mode
     * @return {String} The current mode
     */
    getMode: function() {
      return this._mode;
    },
    /**
     * Set the session identifier
     * @param {String} sid The session identifier
     */
    setSid: function(sessionId) {
      if (sessionId) {
        if (sessionId.length < 24) {
          throw new CError('sid length undersized').log();
        }
        if (sessionId.length > 128) {
          throw new CError('sid length exceeded').log();
        }
        this._sid = sessionId;
      }
    },
    /**
     * Get the session identifier
     * @return {String} The current session identifier
     */
    getSid: function() {
      return this._sid;
    }
  });
};
