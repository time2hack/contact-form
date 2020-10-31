const mailgun = require("mailgun-js")({
  apiKey: process.env.MAILGUN_KEY,
  domain: process.env.MAILGUN_DOMAIN,
  host: process.env.MAILGUN_HOST || "api.eu.mailgun.net",
});

exports.handler = function (event, context, callback) {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "Error", message: "Endpoint only supports POST" }),
    };
  }
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 401,
      body: JSON.stringify({ status: "Error", message: "Not allowed" }),
    };
  }
  /*
  subject: Form Check
  bcc: xxxxxx@xxxx.xxx
  message: some random text
  */
  let reqBody = null;
  try {
    reqBody = JSON.parse(event.body)
  }
  catch (e) {
    console.log(event)
    callback(e.message, {
      statusCode: 400,
      body: `[ERROR] Invalid JSON - ${e.message}`
    })
    return;
  }

  const URL = require('url')
  const https = require('https')

  const verifyEndpoint = `https://www.google.com/recaptcha/api/siteverify?secret${secretKey}&response=${captcha}&remoteip=${ip}`

  const verify = URL.parse(verifyEndpoint)
  const options = {
    hostname: verify.hostname,
    path: verify.pathname,
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  }

  // Set up webhook request
  const req = https.request(options, function(res) {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers: ${JSON.stringify(res.headers)}`)
    res.setEncoding('utf8');

    // Log data
    res.on('data', function (body) {
      console.log(`Body: ${body}`);
    })
  })

  // Handle webhook request error
  req.on('error', function(e) {
    const errorMessage = `[ERROR] Problem with request: ${e.message}`
    console.log(errorMessage)

    callback(
      e.message,
      {
        statusCode: 400,
        body: errorMessage
      }
    )
  })

  // Send form data to webhook request and end request
  req.end()

  const data = {
    from: reqBody.bcc,
    to: process.env.TO_EMAIL || "hello@pankaj.pro",
    subject: "Contact Form Submission",
    template: "contact-form-template",
    "h:X-Mailgun-Variables": JSON.stringify(reqBody),
  };

  mailgun.messages().send(data, function (error, body) {
    if (error) {
      callback(null, {
        statusCode: 500,
        body: JSON.stringify(error || { status: "Error" }),
      });
      return;
    }
    callback(null, {
      statusCode: 200,
      body: JSON.stringify(body || { status: "Success" }),
    });
  });
};
