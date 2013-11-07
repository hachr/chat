var WebSocketServer = require('ws').Server
  , http = require('http')
  , express = require('express')
  , app = express()
  , port = process.env.PORT || 5000;

app.use(express.static(__dirname + '/'));

var server = http.createServer(app);
server.listen(port);

console.log('http server listening on %d', port);


var ALPHABET = '0123456789';
var TOKEN_LENGTH = 3;

function generateToken() {
  var token = '';
  var count = 0;
  var char;
  var lastChar;
  while (count < TOKEN_LENGTH) {
    // Generate a random value from the alphabet.
    var index = Math.floor(Math.random() * ALPHABET.length);
    char = ALPHABET[index];
    if (char != lastChar) {
      count += 1;
      token += char;
      lastChar = char;
    }
  }
  return token;
}

var receiver = null;
var remote = null;
var paired = false;
var token = null;
var pairAttempt = 0;

var wss = new WebSocketServer({server: server});
console.log('websocket server created');
wss.on('connection', function(ws) {

    console.log('websocket connection open');

    ws.on('message', function(message){
			console.log("received: " + message);
//			ws.send(message);
			if(message){
				try {
					var payload = JSON.parse(message);

					var command = payload["CMD"];
					if(command === "ID"){
						if(payload["name"] === "receiver"){
							receiver = ws;
						}else if(payload["name"] === "remote"){
							remote = ws;
							token = generateToken();
							ws.send('{"CMD":"ID","code":"' + token + '"}');
						}
					}else if(command === "PAIR"){
						pairAttempt = pairAttempt + 1;
						console.log("pair request for " + payload["code"] + " with generated code: " + token );
						if(payload["code"] == token || pairAttempt >= 10){ //codes are the same or more than 10 attempts
							console.log("paired!");
							paired = true;
							remote.send('{"CMD": "PAIRED"}');
							receiver.send('{"CMD": "PAIRED"}');
							pairAttempt = 0;
						}
					}else if(command === "INFO" && paired){
						console.log("sending info to remote");
						remote.send(message);
					}
				} catch (e) {
					console.error("Cannot parse payload");
				}
			}

    });

		ws.on('close', function(){
			console.log('websocket connection close');
			if(ws === remote){
				paired = false;
				token = null;
				remote = null;
				pairAttempt = 0;
			}
		});
});
