var app = require('http').createServer(http_server).listen(80, '50.116.46.193')
  , moment = require('moment')
  , stat = require('node-static')
  , redis = require('redis').createClient()
  , socketio = require('socket.io').listen(app)
  , sanitize = require('validator').sanitize;

redis.on("error", function (err) {
        console.log("Error " + err);
    });

socketio.enable('browser client minification');
socketio.enable('browser client etag');
socketio.enable('browser client gzip');
socketio.set('log level', 2);
//socketio.set('origins', '*lokalpo.st:*');// this breaks js for www.
var message_limit = 9; // save and display 10 messages
socketio.sockets.on('connection', function(socket){
  var ip_addr = socket.handshake.address.address;
  var message_key = "message_" + ip_addr;
  var location_key = "location_" + ip_addr;
  // expire redis values after about six months
  var redis_ttl = 60 * 60 * 24 * 30 * 6;
  // join room using ip address as room name
  socket.join(ip_addr);
  room_count();
  redis.lrange(message_key, 0, message_limit, function(err, cached_messages){
    if(cached_messages.length != 0){
      cached_messages = cached_messages.reverse();
      for (var i = 0; i < cached_messages.length; i += 1){
        socket.emit('init', JSON.parse(cached_messages[i]));
      }
    }
  });
  redis.get(location_key, function(err, location){
    if(location){
      socket.emit('location_broadcast', {'location': location});
    }
  });

  function room_count(){
    var data = {};
    data.count = socketio.sockets.clients(ip_addr).length;
    socketio.sockets.in(ip_addr).emit('room_count', data);
  }

  socket.on('message', function(data){
    var now = moment().utc().unix();
    data['time'] = now;
    data.message = clean_input(data.message, 256);
    data.message = urlize(data.message);
    data.name = clean_input(data.name, 32);
    socketio.sockets.in(ip_addr).emit('broadcast', data);
    redis.lpush(message_key, JSON.stringify(data));
    redis.ltrim(message_key, 0, message_limit);
    redis.expire(message_key, redis_ttl);
  });
  socket.on('location', function(data){
    data = clean_input(data, 32);    
    // location is only shown in text input, so we need to decode
    data = sanitize(data).entityDecode();
    socketio.sockets.in(ip_addr).emit('location_broadcast', {'location': data});
    redis.set(location_key, data);
    redis.expire(location_key, redis_ttl);
  });
  socket.on('disconnect', function(data){
    socket.leave(ip_addr);
    room_count();
  });
});

// cache files for 30 days
var static_dir = new(stat.Server)('./public', {cache: 60 * 60 * 24 * 30});

function http_server(req, res) {
  req.addListener('end', function(){
    static_dir.serve(req, res);
  }); 
}

function clean_input(string, max_length){
  // slice string in case user alters client maxlength
  string = string.slice(0, max_length);
  string = sanitize(string).xss();
  return sanitize(string).entityEncode();
}

// url regex from
// http://stackoverflow.com/questions/3809401/what-is-a-good-regular-expression-to-match-a-url
var expression = /[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/gi;
var regex = new RegExp(expression);

function urlize(text){
  return text.replace(regex, function(url){
    if(url.indexOf('://') == -1){
      url = 'http://' + url;
    }
    return '<a href="' + url + '" target="_blank">' + url + '</a>';
  })
}
