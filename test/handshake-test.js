/*global describe, it */

var app  = require('../index')(),
    fs   = require('fs');

var Handshake = app.class.Handshake,
    forge = app.config.crypto;

describe('Handshake header', function() {
  var certificate = fs.readFileSync('./test/cert/serverCert.cer', 'utf8').newLineSanify(),
      key = fs.readFileSync('./test/cert/serverCert.key', 'utf8').newLineSanify(),
      handshake = new Handshake({
        key: key,
        cert: certificate,
        encoderCert: certificate
      });
      handshake.setToken(handshake.generateToken());
  it('it should set a new header', function(done) {
    handshake.getMode().should.equal('handshake');
    handshake.getDate().should.be.an.instanceOf(Number);
    done();
  });
  it('should output is in Base64', function(done) {
    handshake.encode().isBase64().should.true;
    done();
  });
  it('should token is in Hex format', function(done) {
    handshake.getToken().isHex().should.true;
    done();
  });
});