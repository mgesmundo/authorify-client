/**
 * @class node_modules.authorify.config.node
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
 *
 * For more convoluted language, see the LICENSE file.
 *
 */
module.exports = function(app) {
  'use strict';

  // dependencies
  var fs     = require('fs'),
      path   = require('path'),
      jsface = require('jsface');

  require('./default')(app);

  app.jsface = jsface;
  app.config.cert = app.config.cert || fs.readFileSync(path.join(__dirname,'cert/clientCert.cer'), 'utf8');
  app.config.key  = app.config.key  || fs.readFileSync(path.join(__dirname,'cert/clientCert.key'), 'utf8');
  app.config.ca   = app.config.ca   || fs.readFileSync(path.join(__dirname,'cert/serverCA.cer'), 'utf8');

  app.logger.info('%s node config loaded', app.name);

  return app;
};
