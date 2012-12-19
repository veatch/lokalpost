var socket = io.connect('http://lokalpo.st');
function append_message(data, init){
  // Append messages to DOM. If connection has
  // just been established ignore messages 
  // already on DOM (if an iPhone is locked
  // and then unlocked the connection will
  // be closed and then reconnected). 
  if (init && $('#'+data.time).length){
    return;
  }
  var msg = $('<p />', {
    id: data.time,
  });
  if(data.name){
    var bold = $('<b />', {html: data.name + ': '});
    msg.append(bold);
  }
  msg.append(data.message);
  $('#messages').append(msg);
}
socket.on('init', function(data){
  // If nothing's been posted from this network the server will send
  // a message dated 1970, and we'll post a welcome message.
  if((new Date(milliseconds=data.time)).getYear() == 70){
    if ($('#'+data.time).length){
      return;
    }
    var welcome = 'Welcome to lokalpo.st! You can be the first to post at this location. '
    // This is a near-copy of the link in index.html.
    var link = $('<a />', {
      'id': 'welcome',
      'href': '#',
      'rel': 'popover',
      'data-html': 'true',
      'data-placement': 'bottom',
      'data-title': "<a href='#' class='close-popover'>X</a>",
      'data-content': "<p>lokalpo.st lets you post messages to other people on your local network (e.g. home, office, coffee shop). You can use it like a bulletin board or a chat room.</p><p><b>Important:</b> Don't post any private information. Your network's ip address probably changes periodically. After a change, someone who visits lokalpo.st from a different network with your old ip address would be able to see your old posts.</p><p>Built by <a href='http://twitter.com/veatch'>@veatch</a>. Source on <a href='http://github.com/veatch/lokalpost'>github</a>.</p>",
      'text': 'Learn more.'
    });
    var msg = $('<p />', {
      id: data.time,
    });
    msg.append(welcome);
    msg.append(link);
    $('#messages').append(msg);
  } else {
    append_message(data, true);
  }
});
socket.on('broadcast', function(data){
  append_message(data, false);
});
socket.on('location_broadcast', function(data){
  $('#location').val(data.location);
});
$(document).on('submit', '#form', function(){
  var msg = $('#msg_input').val();
  var name = $('#username').val();
  socket.emit('message', {'message': msg, 'name': name});
  $('#msg_input').val('');
  return false;
});

// Location is submitted when location field loses focus
$(document).on('focusout', '#location', function(){
  socket.emit('location', $(this).val());
});

// Clear username and message fields on focus, then
// reset placeholder text on focus out.
$(document).on('focusin', '.clearable', function(){
  $(this).attr('placeholder', '');
});
$(document).on('focusout', '.clearable', function(){
  var placeholder = '';
  if(this.id == "username"){
      placeholder = "your name";
  } else if(this.id == "msg_input"){
      placeholder = "post";
  }
  $(this).attr('placeholder', placeholder);
});

// Show popover when a popover link is clicked.
$(document).on('click', 'a[rel="popover"]', function(){
    $(this).popover('show');
});
// Hide popover when anything else is clicked.
$(document).on('click', function(ev){
  if(!$(ev.target).is('a[rel="popover"]')){
      $('a[rel="popover"]').popover('hide');
  }
});
