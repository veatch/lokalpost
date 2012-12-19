var app = require('http').createServer(http_server).listen(80, '50.116.46.193')
  , stat = require('node-static')
  , redis = require('redis').createClient()
  , socketio = require('socket.io').listen(app)
  , sanitize = require('validator').sanitize;

redis.on("error", function (err) {
        console.log("Error " + err);
    });

socketio.sockets.on('connection', function(socket){
  var ip_addr = socket.handshake.address.address;
  var location_key = ip_addr + "_location";
  // join room using ip address as room name
  socket.join(ip_addr);
  redis.lrange(ip_addr, 0, 4, function(err, cached_messages){
    if(cached_messages.length == 0){
      var beginning = (new Date(year=1970, month=0)).getTime();
      socket.emit('init', {'message': '', 'name':'', 'time':beginning});
    } else {
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

  socket.on('message', function(data){
    var now = (new Date()).getTime();
    data['time'] = now;
    data.message = clean_input(data.message, 256);
    data.name = clean_input(data.name, 32);
    socketio.sockets.in(ip_addr).emit('broadcast', data);
    redis.lpush(ip_addr, JSON.stringify(data));
    redis.ltrim(ip_addr, 0, 4);
  });
  socket.on('location', function(data){
    data = clean_input(data, 32);    
    // location is only shown in text input, so we need to decode
    data = sanitize(data).entityDecode();
    socketio.sockets.in(ip_addr).emit('location_broadcast', {'location': data});
    redis.set(location_key, data);
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
