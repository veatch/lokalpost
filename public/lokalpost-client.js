var socket = io.connect('http://lokalpo.st');
var scrollTop = 0;
var showWelcome = true;
var welcomePadding = 0;

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
    id: data.time
  });
  if(data.name){
    var bold = $('<b />', {html: data.name + ': '});
    msg.append(bold);
  }
  msg.append(data.message);
  var timestamp = $('<span />', {
    'html':moment.unix(data.time).format('h:mm A YYYY-M-D'),
    'style': 'font-size:12px; padding-left:5px; color:#ccc;'
  });
  msg.append(timestamp);
  //scrolled = is_scrolled_to_bottom();
  $('#messages').append(msg);
  if(scrollTop <= $(window).scrollTop()){
    $(window).scrollTop($(document).height());
  }
  // save scrollTop here. next time if scrollTop < savedScrollTop don't autoscroll
  var windowScroll = $(window).scrollTop();
  if(windowScroll > scrollTop){
    scrollTop = windowScroll;
  }
}

function hide_welcome(){
  // Collapses welcome div and appends it to message div.
  // Welcome may or may not be visible depending on how many messages are on page.
  if(showWelcome){// hide_welcome is called multiple times. Only decrease padding the first time
    $('#subcontainer').css('padding-top', '-='+welcomePadding);
  }
  $('#messages').prepend($('#welcome'));
  $('#welcome-more').hide();
  $('#read-more').show();
  showWelcome = false;
}

function is_scrolled_to_bottom(){
  if($(document).height() - $(window).height() == $(window).scrollTop()){
    return true;
  }
  return false;
}

socket.on('init', function(data){
    append_message(data, true);
});
socket.on('broadcast', function(data){
  append_message(data, false);
});
socket.on('location_broadcast', function(data){
  $('#location').val(data.location);
});
socket.on('room_count', function(data){
  $('#room_count').text(data.count);
  if(data.count > 1){
    $('.top-right').show();
  } else {
    $('.top-right').hide();
  }
});
$(document).on('submit', '#form', function(){
  var msg = $('#msg_input').val();
  var name = $('#username').val();
  socket.emit('message', {'message': msg, 'name': name});
  $('#msg_input').val('');
  if(showWelcome){
    hide_welcome();
  }
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

$(document).on('click', '#read-more', function(){
  hide_welcome();
  $(this).hide();
  $('#welcome-more').show();
  $(window).scrollTop();
});

$(document).on('click', '#welcome-close', function(){
  hide_welcome();
});

$(function(){
  // hack. We want the welcome to be inside the fixed header, and
  // we need to adjust the message container's height to match.
  var padding = $('.navbar').height();
  if(padding > 80){
    welcomePadding = padding-80;
    $('#subcontainer').css('padding-top', '+='+welcomePadding);
  }
// add difference to:
  // parseInt($('#subcontainer').css('padding-top'))
  // find header height. find message padding? increment padding by header height
  // when welcome is opened, increment more? when welcome is hidden, subtract extra height
});
