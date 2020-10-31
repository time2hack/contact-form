const secretKey = process.env.RECAPTCHA_SECRETKEY

exports.handler = function (event, context, callback) {

  console.log(event.headers['client-ip'])

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      body: JSON.stringify({ status: "Error", message: "Endpoint only supports POST" }),
    };
  }
  if (event.httpMethod === "POST") {
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

    const verifyEndpoint = `https://www.google.com/recaptcha/api/siteverify?secret${secretKey}&response=${reqBody['g-recaptcha-response']}&remoteip=${event.headers['client-ip']}`

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
        
        const mailgun = require("mailgun-js")({
          apiKey: process.env.MAILGUN_KEY,
          domain: process.env.MAILGUN_DOMAIN,
          host: process.env.MAILGUN_HOST,
        });

        const data = {
          bcc: [reqBody.bcc],
          to: process.env.EMAIL_TO,
          from: process.env.EMAIL_FROM,
          subject: process.env.EMAIL_SUBJECT,
          template: process.env.MAILGUN_TEMPLATE,
          "h:X-Mailgun-Variables": JSON.stringify(
            Object.assign({}, reqBody, {timestamp: (new Date()).toUTCString()})
          ),
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
    
  }
};
