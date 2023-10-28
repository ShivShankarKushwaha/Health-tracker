const nodemailer = require("nodemailer");
const {google} = require("googleapis");
const config = require("./Mail");
const OAuth2 = google.auth.OAuth2;
const PinGenerator = require('./OTP');

const OAuth2_client = new OAuth2(config.clientId, config.clientSecret);
OAuth2_client.setCredentials({refresh_token: config.refreshToken});

function sendMail(recipient,data) {
  // data=JSON.stringify(data);
  console.log('appointment data',data);
  let sentopt =PinGenerator();
  console.log('inside sendmail module',sentopt);
  const access_token = OAuth2_client.getAccessToken();
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: {
      type: "OAUTH2",
      user: config.user,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      refreshToken: config.refreshToken,
      accessToken: access_token,
    },
  });
  if(!data)
  {
    const mailOption = {
      from: `The Health Tracker ${config.user}`,
      to: recipient,
      subject: "Sign Up Otp for Health Tracker Website",
      html: `<h2>Your Otp is: <h1>${sentopt}</h1></h2>`,
    };
    transport.sendMail(mailOption, (err, result) => {
      if (err) {
        console.log(err);
        return sentopt;
      } else {
        console.log(result);
        return sentopt;
      }
    });
  }
  else
  {
    const mailOption2={
      from: `The Health Tracker ${config.user}`,
      to: recipient,
      subject:"Appointment scheduled",
      html:`Your appointment,<br/> ${data[0].date} <br/> ${data[0].time} <br/> ${data[0].message} <br/> is scheduled with ${data[0].doctor}`
    }
    transport.sendMail(mailOption2, (err, result) => {
      if (err) {
        console.log(err);
        return sentopt;
      } else {
        console.log(result);
        return sentopt;
      }
    });

  }
  return sentopt;
}

module.exports =sendMail;