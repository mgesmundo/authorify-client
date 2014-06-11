/*global describe, it */

var app = require('../index')(),
    uuid = require('node-uuid'),
    mixin = app.mixin,
    Class = require('jsface').Class;

var Content = Class(mixin.WithContent, {}),
    content = new Content();

describe('Content mixin', function() {
  it('should set date', function(done) {
    var date = new Date();
    content.setDate(date);
    content.getDate().should.equal(date.toSerialNumber());
    done();
  });
  it('it should set a valid Id', function(done) {
    var id = uuid.v4();
    content.setId(id);
    content.getId().should.equal(id);
    done();
  });
  it("it shouldn't set a wrong id", function(done) {
    (function (){
      content.setId('wrongid');
    }).should.throw('id not valid');
    done();
  });
  it('should set a valid app', function(done) {
    var id = uuid.v4();
    content.setApp(id);
    content.getApp().should.equal(id);
    done();
  });
  it("it shouldn't set a wrong app", function(done) {
    (function (){
      content.setApp('wrongapp');
    }).should.throw('app not valid');
    done();
  });
  it('should set username', function(done) {
    content.setUsername('username');
    content.getUsername().should.equal('username');
    done();
  });
  it('should set and verify password', function(done) {
    var pwd = 'password';
    content.setPassword(pwd);
    content.verifyPassword(pwd).should.true;
    done();
  });
});