const nodemailer = require('nodemailer');
const markdown = require('nodemailer-markdown').markdown;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport('smtps://esstarstudy%40gmail.com:s3401662@smtp.gmail.com');

const posting = function(title, md){
  // setup e-mail data with unicode symbols
  transporter.use('compile', markdown());
  let mailOptions = {
      from: 'David <esstarstudy@gmail.com>', // sender address
      to: 'hega782dani@post.wordpress.com', // list of receivers
      subject: title, // Subject line
      //text: text //'Hello world ?', // plaintext body
      markdown: md
      //html: text // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });

}

posting("test", "markdown test");
