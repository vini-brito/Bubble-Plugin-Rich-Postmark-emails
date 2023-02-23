function(properties, context) {

    const postmark = require("postmark");
    const mime = require('mime-types');
    const fetch = require('cross-fetch');

    if (!String.prototype.replaceAll) {
        String.prototype.replaceAll = function(str, newStr){
    
            // If a regex pattern
            if (Object.prototype.toString.call(str).toLowerCase() === '[object regexp]') {
                return this.replace(str, newStr);
            }
    
            // If a string
            return this.replace(new RegExp(str, 'g'), newStr);
    
        };
    }

    const protocolFix = (possibleUrl) => {

        if (possibleUrl.substring(0, 4) === "http") {

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

    let listOfRecipients = getList(properties[`list_of_tos`], 0, properties[`list_of_tos`].length());


    let varObject = {};

    for (i = 0; i < 10; i++) {

        if (typeof properties[`var_${i + 1}`] !== "undefined" && properties[`var_${i + 1}`] !== null) {

            varObject[`var${i + 1}`] = getList(properties[`var_${i + 1}`], 0, properties[`var_${i + 1}`].length());

        }

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


    var client = new postmark.ServerClient(context.keys["Server key"]);

    return context.async(async callback => {
        try {

            let listOfEmailObjects = [];


            for (i = 0; i < listOfRecipients.length; i++) {


                let emailObject = {
                    "From": properties.from,
                    "To": listOfRecipients[i],
                    "TrackOpens": properties.track_opens,
                    "TrackLinks": properties.track_link_clicks,
                };

                if (typeof properties.html_body !== "undefined" && properties.html_body) {

                    emailObject.HtmlBody = properties.html_body;

                    for (j = 0; j < 10; j++) {

                        if (typeof varObject[`var${j + 1}`] !== "undefined" && varObject[`var${j + 1}`] !== null) {


                            emailObject.HtmlBody = emailObject.HtmlBody.replaceAll(`{{var${j + 1}}}`, varObject[`var${j + 1}`][i])


                        }

                    }

                };


                if (typeof properties.text_body !== "undefined" && properties.text_body) {

                    emailObject.TextBody = properties.text_body;

                    for (j = 0; j < 10; j++) {

                        if (typeof varObject[`var${j + 1}`] !== "undefined" && varObject[`var${j + 1}`] !== null) {


                            emailObject.TextBody = emailObject.TextBody.replaceAll(`{{var${j + 1}}}`, varObject[`var${j + 1}`][i])


                        }

                    }

                };


                if (typeof properties.subject !== "undefined" && properties.subject) {

                    emailObject.Subject = properties.subject;

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



                listOfEmailObjects.push(emailObject)


            }



           let result = await client.sendEmailBatch(listOfEmailObjects);

           let messageIDs = result.map(logObj => logObj.MessageID);

            callback(null, {"message_ids": messageIDs});

        } catch (err) {

            callback(err);

        }
    });


}