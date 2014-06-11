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
module.exports = function(config) {
  'use strict';

  // dependencies
  var load   = require('express-load'),
      path   = require('path'),
      forge  = require('node-forge'),
      errors = require('logged-errors');

  config = config || {};
  config.crypto = config.crypto || forge;

  // namespace
  var app = {
    config: config,
    errors: errors
  };

  var cwd = path.resolve(__dirname, 'lib');

  // load all scripts
  load('class/Store', { cwd: cwd })
    .then('config/node')
    .then('helper')
    .then('mixin')
    .then('class/Header')
    .then('class')
    .then('plugin')
    .into(app);

  // remove unwanted property because app.config.default is assigned to app.config
  delete app.config.default;

  var client = require('./lib/client')(app);
  app.plugin = client.plugin;

  return client;
};
