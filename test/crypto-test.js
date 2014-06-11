/*global describe, it */

var app = require('../index')(),
    fs = require('fs'),
    mixin = app.mixin,
    Class = require('jsface').Class;

var Crypto = Class(mixin.WithCrypto, {});

var server = new Crypto(),
    client = new Crypto(),
    fakeClient = new Crypto();

describe('Crypto mixin', function() {
  describe('Read server certificates', function() {
    it('set RSA key from file', function(done) {
      var certificate = fs.readFileSync('./test/cert/serverCert.key', 'utf8');
      server.setKey(certificate);
      certificate = certificate.newLineSanify();
      server.getKeyPem().should.equal(certificate);
      done();
    });
    it('set cert from file', function(done){
      var certificate = fs.readFileSync('./test/cert/serverCert.cer', 'utf8');
      server.setCert(certificate);
      certificate = certificate.newLineSanify();
      server.getCertPem().should.equal(certificate);
      done();
    });
    it('set CA cert from file', function(done) {
      var certificate = fs.readFileSync('./test/cert/serverCA.cer', 'utf8');
      server.setCa(certificate);
      certificate = certificate.newLineSanify();
      server.getCaPem().should.equal(certificate);
      done();
    });
  });

  describe('Read client certificates', function() {
    it('set RSA key from file', function(done) {
      var certificate = fs.readFileSync('./test/cert/clientCert.key', 'utf8');
      client.setKey(certificate);
      certificate = certificate.newLineSanify();
      client.getKeyPem().should.equal(certificate);
      done();
    });
    it('set cert from file', function(done){
      var certificate = fs.readFileSync('./test/cert/clientCert.cer', 'utf8');
      client.setCert(certificate);
      certificate = certificate.newLineSanify();
      client.getCertPem().should.equal(certificate);
      done();
    });
  });

  describe('Validate certificates', function() {
    it('should verify server certificate', function(done) {
      var certificate = fs.readFileSync('./test/cert/serverCert.cer', 'utf8');
      server.verifyCertificate(certificate).should.true;
      done();
    });
    it('should verify client certificate', function(done) {
      var certificate = fs.readFileSync('./test/cert/clientCert.cer', 'utf8');
      client.verifyCertificate(certificate).should.true;
      done();
    });
    it("shouldn't verify fake certificate", function(done) {
      var certificate = fs.readFileSync('./test/cert/fake.cer', 'utf8');
      fakeClient.verifyCertificate(certificate).should.false;
      done();
    });
  });

  describe('Encrypt a message with RSA', function() {
    it('should encrypt a message with server RSA public key and decrypt with server RSA private key', function(done) {
      var encoded = server.encryptRsa('message');
      var decoded = server.decryptRsa(encoded);
      decoded.should.equal('message');
      done();
    });
    it('should encrypt a message with client RSA public key and fail to decrypt with server RSA private key', function(done) {
      var encoded = client.encryptRsa('message');
      (function (){
        server.decryptRsa(encoded);
      }).should.throw('Invalid RSAES-OAEP padding.');
      done();
    });
  });
  describe('Encrypt a message with AES', function() {
    it('should encoding in Base64', function(done){
      var secret = server.generateSecret();
      var encoded = server.encryptAes('message', secret);
      var decoded = server.decryptAes(encoded, secret);
      decoded.should.equal('message');
      done();
    });
    it('should encoding in Base64url', function(done){
      var secret = server.generateSecret();
      var encoded = server.encryptAes('message', secret, 'url');
      var decoded = server.decryptAes(encoded, secret, 'url');
      decoded.should.equal('message');
      done();
    });
  });
  describe('Sign a message', function() {
    it('sign a message using server RSA private key and verify it using server RSA public key', function(done) {
      var signature = server.sign('message to sign');
      var verify = server.verifySignature('message to sign', signature);
      verify.should.true;
      done();
    });
    it('sign a message using server RSA private key and fail to verify it using client RSA public key', function(done) {
      var signature = server.sign('message to sign');
      var verify = client.verifySignature('message to sign', signature);
      verify.should.false;
      done();
    });
  });
});