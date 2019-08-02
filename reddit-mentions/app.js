"use strict";
/* Notes
 * TODO: Ensure mentions aleady in URLs are ignored
 */
// Requires
const express = require('express');
const fs = require('fs');
const request = require('request');
// Global Declarations
const app = express();
const port = process.env.port;
const keys = JSON.parse(fs.readFileSync('../keys.json', 'utf-8'));
let botID;
// Functions
function getBotID(key = keys.bot_oauth) {
    return new Promise((resolve, reject) => {
        if (botID) {
            resolve(botID);
            return;
        }
        let requestOptions = {
            auth: {
                bearer: key
            }
        };
        request.post('https://slack.com/api/auth.test', requestOptions, (err, resp, body) => {
            if (err) {
                console.error("Error retrieving bot's user ID: " + err);
                reject();
                return;
            }
            let response = JSON.parse(body);
            if (response.ok == false) {
                console.error("Bad request while retrieving bot's user ID: " + body);
                reject();
                return;
            }
            let requestOptions = {
                auth: {
                    bearer: key
                },
                qs: {
                    user: response.user_id
                }
            };
            request.get('https://slack.com/api/users.info', requestOptions, (err, resp, body) => {
                if (err) {
                    console.error('Error retrieving bot ID: ' + err);
                    reject();
                    return;
                }
                let response = JSON.parse(body);
                if (response.ok == false) {
                    console.error('Bad request while retrieving bot ID: ' + response);
                    reject();
                    return;
                }
                let id = response.user.profile.bot_id;
                console.log(`Retrieved bot ID: ${id}\n`);
                botID = id;
                resolve(id);
            });
        });
    });
}
function isOwnMessage(event, id) {
    if (!event.bot_id)
        return false;
    return event.bot_id === id;
}
function parseMentions(input) {
    const mentions = new Set();
    const pattern = /(?<!reddit\.com\/)\b([ur]\/[\w\-]*)/g;
    let matches = input.match(pattern);
    if (matches) {
        matches.forEach(match => {
            mentions.add('/' + match);
        });
    }
    return mentions;
}
function createReply(mentions) {
    if (!mentions.size)
        return '';
    let sortedMentions = Array.from(mentions).sort();
    let message = '*Subreddits and users mentioned:*\n\n';
    sortedMentions.forEach(mention => {
        message += `*${mention}:* https://reddit.com${mention}\n`;
    });
    return message;
}
function sendReply(message, req, key = keys.bot_oauth) {
    if (key === undefined)
        throw "'key' is undefined!";
    let event = req.body.event;
    let requestOptions = {
        auth: {
            bearer: key
        },
        json: {
            as_user: false,
            channel: event.channel,
            text: message,
            username: 'Mentionbot'
        }
    };
    if (event.thread_ts)
        requestOptions.json.thread_ts = event.thread_ts;
    else
        requestOptions.json.thread_ts = event.ts;
    console.log(`Replying to message [${req.body.event_id}]:\n${indentString(message)}\n`);
    request.post('https://slack.com/api/chat.postMessage', requestOptions, (err, resp, body) => {
        if (err) {
            console.error();
            return;
        }
        if (body.ok === false)
            console.log('Error sending reply: ' + body);
    });
}
// Helper Functions
function indentString(str, indent = 4) {
    if (!str)
        return '';
    let indentation = ' '.repeat(indent);
    return indentation + str.replace(/\n/g, '\n' + indentation);
}
// Server Logic
app.use(express.json());
app.post('/events', (req, res) => {
    res.sendStatus(200);
    let event = req.body.event;
    // Check if the message is ours
    getBotID()
        .then(id => isOwnMessage(event, id))
        .then((ownMessage) => {
        if (ownMessage)
            return;
        console.log(`Message POSTed to '/events' [${req.body.event_id}]:\n${indentString(event.text)}\n`);
        // console.log(req.body); 
        let mentions = parseMentions(event.text);
        let reply = createReply(mentions);
        if (reply)
            sendReply(reply, req);
    }).catch();
});
app.listen(port, () => console.log(`App listening on port ${port}!`));
