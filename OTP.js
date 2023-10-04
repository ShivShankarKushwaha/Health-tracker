const otpGenerator = require("otp-generator");
function PinGenerator() {
  pinReturn = otpGenerator.generate(5, {digits: true, upperCase: true, specialChars: false, alphabets: false});
  console.log(pinReturn);
  return pinReturn;
}
PinGenerator.prototype.getPin = function () {
  return pinReturn;
};
module.exports =PinGenerator;
