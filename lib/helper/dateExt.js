module.exports = function(app) {
  'use strict';

  var extend = app.jsface.extend,
      iDate = app.iDate;

  var dateExt = {
    toRfc3339: function() {
      return iDate(this);
    },
    toSerialNumber: function() {
      return this.getTime() - (new Date(1970,1,1)).getTime();
    }
  };

  extend(Date.prototype, dateExt);

  return dateExt;
};