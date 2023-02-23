function(properties, context) {

  const postmark = require("postmark");
  const mime = require('mime-types');
  const fetch = require('cross-fetch');

  const protocolFix = (possibleUrl) => {

    if (possibleUrl.substring(0,4) === "http") {

      return possibleUrl;
   
    } else {

      return `https:${possibleUrl}`;

    }

  };


  // this returns an array holding the list of texts (strings), booleans (yes/no) and integers (decimals and numbers)
  const getList = (thingWithList, startPosition, finishPosition) => {
    let returnedList = thingWithList.get(startPosition, finishPosition);
    return returnedList;
  }

  if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {

    var listOfFileUrls = getList(properties[`attachment_files`], 0, properties[`attachment_files`].length());
    var attachmentsReadyForEmail = [];



    for (i = 0; i < listOfFileUrls.length; i++) {

      let base64EncodedFile = context.async(async callback => {
        try {

          let currentUrl = protocolFix(listOfFileUrls[i]);

          let response = await fetch(currentUrl);
          let buffered = await response.arrayBuffer();
          let base64file = Buffer.from(buffered).toString('base64');

          callback(null, base64file);
        }
        catch (err) {
          callback(err);
        }
      });

      let currentFileName = listOfFileUrls[i].split('/').pop();

      let currentObject = {
        "Name": currentFileName,
        "Content": base64EncodedFile,
        "ContentType": mime.lookup(currentFileName)
      }

      attachmentsReadyForEmail.push(currentObject)

    }



  }


  // Send an email:
  var client = new postmark.ServerClient(context.keys["Server key"]);

  return context.async(async callback => {
    try {


      let emailObject = {
        "From": properties.from,
        "To": properties.to,
        "TrackOpens": properties.track_opens,
        "TrackLinks": properties.track_link_clicks,
      };

      if (typeof properties.html_body !== "undefined" && properties.html_body) {

        emailObject.HtmlBody = properties.html_body; // "<b>Hello</b> <img src=\"cid:image.jpg\"/>" Escape double quotes

      };

      if (typeof properties.text_body !== "undefined" && properties.text_body) {

        emailObject.TextBody = properties.text_body;

      };

      if (typeof properties.subject !== "undefined" && properties.subject) {

        emailObject.Subject = properties.subject; // "<b>Hello</b> <img src=\"cid:image.jpg\"/>" Escape double quotes

      };


      if (typeof properties.reply_to !== "undefined" && properties.reply_to) {

        emailObject.ReplyTo = properties.reply_to;

      };


      if (typeof properties.stream_id !== "undefined" && properties.stream_id) {

        emailObject.MessageStream = properties.stream_id;

      };


      if (typeof properties.attachment_files !== "undefined" && properties.attachment_files) {

        emailObject.Attachments = attachmentsReadyForEmail;

      };

      if (typeof properties.cc !== "undefined" && properties.cc) {

        emailObject.Cc = properties.cc;

      };

      if (typeof properties.bcc !== "undefined" && properties.bcc) {

        emailObject.Bcc = properties.bcc;

      };





      var sentEmail = await client.sendEmail(emailObject);

      callback(null, {"message_id": sentEmail.MessageID});

    } catch (err) {

      callback(err);

    }
  });


}