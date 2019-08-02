"use strict";
const express = require('express');
const app = express();
const port = process.env.PORT;
app.post('/events', (req, res) => {
    console.log('Received verification request:\n' + req.body);
    res.send(req.body.challenge);
});
