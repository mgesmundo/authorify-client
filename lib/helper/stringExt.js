module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend;

  var stringExt = {
    capitalize: function() {
      return this.charAt(0).toUpperCase() + this.slice(1);
    },
    startsWith: function(starts) {
      if (starts === '') {
        return true;
      }
      if (starts === null || starts === undefined) {
        return false;
      }
      starts = String(starts);
      if (this.length >= starts.length) {
        return (this.slice(0, starts.length) === starts);
      }
      return false;
    },
    newLineSanify: function() {
      return this.replace(/(\r\n|\n\r|\r)/gm, '\n');
    },
    urlSanify: function() {
      var result = this;
      if (result.length > 0) {
        if (result.charAt(0) !== '/') {
          result = '/' + result;
        }
        if (result.length > 1 && result.charAt(result.length - 1) === '/') {
          result = result.slice(0, result.length - 1);
        }
      } else {
        result = '/';
      }
      return result;
    }
  };

  extend(String.prototype, stringExt);

  return stringExt;
};