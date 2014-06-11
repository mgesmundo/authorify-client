/**
 * @ignore
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
 * - For more convoluted language, see the LICENSE file.
 *
 */
module.exports = (function() {
  'use strict';

  var config = {};

  config.class = {};
  config.class.Store = require('./lib/class/Store')();
  config.config = {};
  config.config.crypto = window.forge;

  var app = require('./lib/config/browser')(config);

  // common
  app.jsface = window.jsface;
  app.errors = window.loggedErrors;

  app.helper = {};
  app.helper.dateHex = require('./lib/helper/dateExt')(app);
  app.helper.regExp = require('./lib/helper/regExp')(app);
  app.helper.stringExt = require('./lib/helper/stringExt')(app);

  app.mixin = {};
  app.mixin.WithContent = require('./lib/mixin/WithContent')(app);
  app.mixin.WithCrypto = require('./lib/mixin/WithCrypto')(app);
  app.mixin.WithPayload = require('./lib/mixin/WithPayload')(app);

  app.class = {};
  app.class.Store = require('./lib/class/Store')();
  app.class.Header = require('./lib/class/Header')(app);
  app.class.Authentication = require('./lib/class/Authentication')(app);
  app.class.Authorization = require('./lib/class/Authorization')(app);
  app.class.Handshake = require('./lib/class/Handshake')(app);

  var client = require('./lib/client')(app);
  app.plugin = client.plugin;

  window.authorify = client;

}());
