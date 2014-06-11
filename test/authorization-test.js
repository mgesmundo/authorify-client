/*global describe, it */

var app  = require('../index')(),
    fs   = require('fs');

var Auth  = app.class.Authorization,
    Header = app.class.Header;

describe('Authorization header', function() {
  var cert = fs.readFileSync('./test/cert/serverCert.cer', 'utf8').newLineSanify(),
      key = fs.readFileSync('./test/cert/serverCert.key', 'utf8').newLineSanify(),
      encoderCert = fs.readFileSync('./test/cert/serverCert.cer', 'utf8').newLineSanify(),
      auth = new Auth({
        key: key,
        cert: cert,
        encoderCert: encoderCert,
        token: '0123456789abcdef'
      }),
      signature;
  it('it should set a new request header', function(done) {
    auth.setSid('000000000000000000000000');
    auth.getSid().should.equal('000000000000000000000000');
    auth.setSecret(auth.keychain.generateSecret());
    auth.getDate().should.be.an.instanceOf(Number);
    done();
  });
  it('should output contains all properties', function(done) {
    var out = auth.encode();
    out.isBase64().should.true;
    var outDecoded = Header.parse(out, key, cert);
    outDecoded.payload.mode.should.equal('auth');
    outDecoded.payload.sid.should.exist;
    outDecoded.payload.secret.should.exist;
    outDecoded.content.date.should.exist;
    outDecoded.signature.isBase64().should.true;
    done();
  });
});