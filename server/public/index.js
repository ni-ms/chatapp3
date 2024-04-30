$(document).ready(function () {
    var socket = io.connect();

    function handlePageUnload() {
        socket.emit('leave_chat');
    }

    // Go to chat page
    $('#chatButton').click(function () {
        var gender = $('#gender').val();
        var tags = $('#tags').val().toLowerCase().split(/[,]+/);
        // console.log(tags);
        socket.emit('register', {gender: gender, tags: tags});
        $('#registration').hide();
        $('#chat').show().css('display', 'flex');
    });

    // Send a message
    $('#sendButton').click(function () {
        var message = $('#messageInput').val();
        $('#messages').append('<p class="my-1"> You: ' + message + '</p>');
        socket.emit('message', message);
        $('#messageInput').val('');
        $("#messages").animate({
            scrollTop: $('#messages').get(0).scrollHeight
        }, 2000);
    });

    // Skip the current match
    $('#skipButton').click(function () {
        socket.emit('skip');
    });

    // Receive a message
    socket.on('message', function (message) {
        $('#messages').append('<p class="other-1"> Other: ' + message + '</p>');
        $("#messages").animate({
            scrollTop: $('#messages').get(0).scrollHeight
        }, 2000);
    });

    // Match with a user
    socket.on('match', function (data) {
        $('#messages').find('.matchmsg').remove();
        $('#messages').append('<p class="matchmsg">Matched with ' + data + '</p>');
    });

    // Waiting for a match
    socket.on('waiting', function () {
        $('#messages').append('<p class="matchmsg">Waiting for a match</p>');
    });

    socket.on("skip", function() {
        $('#messages').append('<p class="matchmsg">Skipped</p>');
    });

    // Handle page unload or navigation
    $(window).on('beforeunload', handlePageUnload);
});