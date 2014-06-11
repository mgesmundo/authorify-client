module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend;

  var regExp = {
    isUuid: function() {
      return (this.match(/([a-f\d]{8}(-[a-f\d]{4}){3}-[a-f\d]{12}?)/ig) ? true : false);
    },
    isBase64: function() {
      return (this.match(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/i) ? true : false);
    },
    isHex: function() {
      return (this.match(/(0x)?[0-9a-f]+/i) ? true : false);
    }
  };

  extend(String.prototype, regExp);

  return regExp;
};