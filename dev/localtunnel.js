const localtunnel = require('localtunnel');

const port = 8000;

let tunnel = localtunnel(port, {subdomain: 'redditmentions'}, function(err, tunnel) {
    if (err) console.log(err);

    console.log(`Tunnel running on port ${port} at ${tunnel.url}.`);
});

tunnel.on('close', function() {
    console.log('Tunnel closed.');
});