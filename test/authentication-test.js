/*global describe, it */

var app  = require('../index')(),
    fs   = require('fs'),
    uuid = require('node-uuid');

var Auth  = app.class.Authentication,
    Header = app.class.Header,
    forge = app.config.crypto;

describe('Authentication header', function() {
  var cert = fs.readFileSync('./test/cert/serverCert.cer', 'utf8').newLineSanify(),
      key = fs.readFileSync('./test/cert/serverCert.key', 'utf8').newLineSanify(),
      encoderCert = fs.readFileSync('./test/cert/serverCert.cer', 'utf8').newLineSanify(),
      auth = new Auth({
        key: key,
        cert: cert,
        encoderCert: encoderCert
      }),
      signature;
  it('it should set a new request header', function(done) {
    var id = uuid.v4(),
        app = uuid.v4();

    auth.setSid('000000000000000000000000');
    auth.getSid().should.equal('000000000000000000000000');
    auth.setSecret(auth.keychain.generateSecret());
    auth.getDate().should.be.an.instanceOf(Number);
    auth.setId(id);
    auth.getId().should.equal(id);
    auth.setApp(app);
    auth.getApp().should.equal(app);
    auth.setUsername('username');
    auth.getUsername().should.equal('username');
    auth.setPassword('password');
    auth.getPassword().should.equal('password');
    done();
  });
  it('should signature exist', function(done) {
    auth.setToken(auth.generateToken());
    signature = auth.generateSignature();
    signature.isBase64().should.true;
    done();
  });
  it('should output contains all properties', function(done) {
    var out = auth.encode();
    out.isBase64().should.true;
    var outDecoded = Header.parse(out, key, cert);
    outDecoded.payload.secret.should.exist;
    outDecoded.content.date.should.exist;
    outDecoded.content.id.should.exist;
    outDecoded.content.app.should.exist;
    outDecoded.content.username.should.exist;
    outDecoded.content.password.should.exist;
    outDecoded.signature.isBase64().should.true;
    done();
  });
  it('it should set a new response header', function(done) {
    var id  = uuid.v4(),
        app = uuid.v4();

    auth = new Auth({
      reply: true,
      key: key,
      cert: cert,
      encoderCert: encoderCert,
      id: id,
      app: app,
      sid: '000000000000000000000000'
    });
    var secret = auth.keychain.generateSecret();
    auth.setSecret(secret);
    forge.util.encode64(auth.getSecret()).should.equal(secret);
    auth.getDate().should.be.an.instanceOf(Number);
    auth.getId().should.equal(id);
    auth.getApp().should.equal(app);
    auth.setUsername('username');
    auth.getUsername().should.equal('username');
    done();
  });
  it('should output is wrong if token is missing', function(done) {
    (function (){
      auth.encode();
    }).should.throw('missing token');
    done();
  });
  it('should set token for response header', function(done) {
    auth.setToken(auth.generateToken());
    done();
  });
  it('should output contains all properties', function(done) {
    var out = auth.encode();
    out.isBase64().should.true;
    var outDecoded = Header.parse(out, key, cert);
    outDecoded.payload.mode.should.exist;
    outDecoded.payload.sid.should.exist;
    outDecoded.payload.secret.should.exist;
    outDecoded.content.date.should.exist;
    outDecoded.content.token.should.exist;
    outDecoded.content.id.should.exist;
    outDecoded.content.app.should.exist;
    outDecoded.signature.should.exist;
    done();
  });
});