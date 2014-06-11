/*global describe, it */

var app = require('../index')(),
    mixin = app.mixin,
    forge = app.config.crypto,
    Class = require('jsface').Class;

var Payload = Class(mixin.WithPayload, {}),
    payload = new Payload();

describe('Payload mixin', function() {
  it('should set allowed mode', function(done) {
    payload.setMode('auth-init');
    payload.getMode().should.equal('auth-init');
    done();
  });
  it("shouldn't set not allowed mode", function(done) {
    (function (){
      payload.setMode('init');
    }).should.throw('not allowed payload mode');
    done();
  });
  it('should set sid', function(done) {
    payload.setSid('000000000000000000000000');
    payload.getSid().should.equal('000000000000000000000000');
    done();
  });
  it("shouldn't set sid with wrong lenght", function(done) {
    (function(){
      payload.setSid('0');
    }).should.throw('sid length undersized');
    done();
  });
});