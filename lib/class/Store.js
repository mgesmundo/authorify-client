/**
 * A class for node and web storage management.
 *
 * @class node_modules.authorify_client.class.Store
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
module.exports = function() {
  // dependencies
  var Class = require('jsface').Class,
      store = require('cargo');

  return Class({
    /**
     * The constructor
     *
     * @param {String} [name = 'authorify'] The name of the store
     * @param {Boolean} [persistent = false] When true the store is local (persistent), otherwise it is per session (volatile)
     * @constructor
     */
    constructor: function(name, persistent) {
      this.prefix = (name || 'authorify') + '::';
      this.store = store;
      if (persistent) {
        this.store.proxy = store.local;
      } else {
        this.store.proxy = store.session;
      }
    },
    /**
     * Destroy a stored item
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the operation is done
     * @return {callback(err, key)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {String} callback.key The key of the destroyed item
     */
    destroy: function(key, callback) {
      if (key) {
        this.store.proxy.remove(this.prefix + key);
        if (callback) {
          callback(null, key);
        }
      } else {
        if (callback) {
          callback('missing key');
        }
      }
    },
    /**
     * Load stored item
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the item is loaded
     * @return {callback(err, data)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {Object} callback.data The loaded item
     */
    load: function(key, callback) {
      if (key) {
        var _data = this.store.proxy.get(this.prefix + key),
            data;
        if ('undefined' !== typeof window) {
          // browser
          try {
            data = JSON.parse(_data);
          } catch (e) {
            data = _data;
          }
        } else {
          data = _data;
        }
        callback(null, data);
      } else {
        callback('missing key');
      }
    },
    /**
     * Save an item
     *
     * @param {String} key The key of the item
     * @param {Object} data The item
     * @param {Function} callback Function called when the session is saved
     * @return {callback(err)} The callback to execute as result
     * @param {String} callback.status Result from Redis query
     */
    save: function(key, data, callback) {
      if (key) {
        if (data) {
          var _data = data;
          if ('undefined' !== typeof window && 'object' === typeof data) {
            _data = JSON.stringify(_data);
          }
          this.store.proxy.set(this.prefix + key, _data);
          callback(null);
        } else {
          callback('missing data');
        }
      } else {
        callback('missing key');
      }
    },
    /**
     * Check if an item exists
     *
     * @param {String} key The key of the item
     * @param {Function} callback Function called when the item is verified
     * @return {callback(err, exists)} The callback to execute as result
     * @param {String} callback.err Error if occurred
     * @param {Boolean} callback.exists Return true if the item exists
     */
    exists: function(key, callback) {
      this.load(key, function(err, data) {
        callback(err, (data));
      });
    }
  });
};
