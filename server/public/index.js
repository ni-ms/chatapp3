//HTML CONTENT
const contentArr = [
    `<div class="registration" id = "home-page">
    <h2 class="mb-4">SimplyChat</h2>
 
    <div class = "select-container form-group">
        <label>Gender</label>
        <div class="dropdown" id="gender-form-group">
            <div class="select">
                <span>Select Gender</span>
            </div>
            <input type = "hidden" id="gender" class="form-control">
            <ul class = "dropdown-menu">
                <li id="male">Male <i class="fa-solid fa-mars"></i></li>
                <li id="female">Female <i class="fa-solid fa-venus"></i></li>
            </ul>
        </div>
    </div>
 
    <div class="form-group" id="tags-form-group">
        <label for="tags">Tags</label>
        <input type="text" id="tags" class="form-control">
    </div>
   
    <div id= "home-btns">
        <button id="chatButton" class="btn btn-primary">Chat</button>
        <button id="chatButton" class="btn btn-primary">Video</button>
    </div>
 
    <div id="signreg-stmt">
        <span class="sign-in-btn">Sign in</span> or <span class="reg-btn">Register</span> to make
        friends
    </div>
 
    </div>`
    ,
    `<div class = "registration" id="sign-up">
        <div id="sign-up-header">
            <i class="fa fa-home fa-2x" id="home-btn" aria-hidden="true"></i>
            <h2>Register</h2>
        </div>
        <div class = "signup-form">
            <div class="signup-group" id="name-signup-group">
                <label for="name">Name:</label>
                <input type="text" id="name" class="signup-control">
            </div>
            <div class="signup-group" id="username-signup-group">
                <label for="username">Username:</label>
                <input type="text" id="username" class="signup-control">
            </div>
            <div class="signup-group" id="emailid-signup-group">
                <label for="emailid">Email ID:</label>
                <input type="text" id="emailid" class="signup-control">
            </div>
            <div class="signup-group" id="dob-signup-group">
                <label for="dob">DOB:</label>
                <input type="date" id="dob" class="signup-control">
            </div>
            <div class="signup-group" id="gender-signup-group">
                <label for="gender">Gender:</label>
                <select id="gender">
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                </select>
            </div>
            <div class="signup-group" id="password-signup-group">
                <label for="password">Password:</label>
                <input type="text" id="password" class="signup-control">
            </div>
        </div>
        <button id="chatButton" class="btn btn-primary">Register</button>
        <div id="signreg-stmt">Already an User? <span class="sign-in-btn">Sign in</span><div>
        </div>`,
           
           
            `
        <div class = "registration" id="home-page">
            <div id="sign-up-header">
            <div class="home-btn-group">
                <i class="fa fa-home fa" id="home-btn" aria-hidden="true"></i>
                <div class="home-btn-label">Home</div>
            </div>
            <h2>Sign In</h2>
            </div>
            <div class="form-group" id="username-signup-group">
                <label for="username">Username</label>
                <input type="text" id="username" class="form-control">
            </div>
            <div class="form-group" id="password-signup-group">
                <label for="password">Password</label>
                <input type="text" id="password" class="form-control">
            </div>
            <button id="chatButton" class="btn btn-primary">Sign In</button>
            <div id="signreg-stmt">New User? <span class="reg-btn">Register</span> to make
            friends</div>
        </div>`
    ];
 
   
 
    let pageNum = 0;
   
    function attachEventListeners() {
        var socket = io.connect('http://localhost:3000');
        let flag = false;
        //select jquery
        $('.dropdown').click(function (event) {
            if($(event.target).closest('.dropdown-menu').length) return;
            console.log("DROPDOWN CLICKED");
            $(this).attr('tabindex', 1).focus();
            if(flag)
            {
                $.when(
                    $(this).find('.dropdown-menu').slideToggle(300)
                ).done(()=>{
                    $(this).css({'border-radius':'15px'})
                });
            }else
            {
                $(this).css({'border-radius':'15px 15px 0px 0px'});
                setTimeout(()=>{
                    $(this).find('.dropdown-menu').slideToggle(300);
                },300);
            }
            flag = !flag;
        });
        $('.dropdown').focusout(function () {
            $.when(
                $('.dropdown-menu').slideUp(500)
            ).done(function() {
                $('.dropdown').css({'border-radius': '15px'});
                flag = false;
            });
        });
   
           
        $('.dropdown-menu li').click(function () {
            $.when(
                $('.dropdown-menu').slideToggle(300)
            ).done(()=>{
                $('.dropdown').css({'border-radius':'15px'})
                $('.dropdown').find('span').text($(this).text());
                $('.dropdown').find('input').attr('value', $(this).attr('id'));
                flag = false;
            });
        });
    /*End Dropdown Menu*/
 
    // Go to chat page
    $('#chatButton').click(function () {
        var gender = $('#gender').val();
        var tags = $('#tags').val().toLowerCase().split(/[,]+/);
        // console.log(tags);
        socket.emit('register', { gender: gender, tags: tags });
        $('#registration').hide();
        $('#container').hide();
        $('#chat').show().css('display', 'flex');
    });
 
    $('#home-btn').click(function () {
        pageNum = 0;
        $('#container').html(contentArr[pageNum]);
        attachEventListeners();
    })
 
    var sendMessageFunc = () =>
    {
        var message = $('#messageInput').val();
        $('#messages').append('<div id="msg-holdermy"><p class="my1"> You: ' + message + '</p></div>');
        socket.emit('message', message);
        $('#messageInput').val('');
        $("#messages").animate({
            scrollTop: $('#messages').get(0).scrollHeight
        }, 2000);
    }
 
    $('#messageInput').keypress(function(event) {
        if (event.which === 13) {
            sendMessageFunc();
        }
    });
   
    // Send a message
    $('#sendButton').click(function () {
        sendMessageFunc();
    });
 
    // Skip the current match
    $('#skipButton').click(function () {
        socket.emit('skip');
    });
 
    // Receive a message
    socket.on('message', function (message) {
        $('#messages').append('<div id="msg-holderother"><p class="other1"> Other: ' + message + '</p></div>');
        $("#messages").animate({
            scrollTop: $('#messages').get(0).scrollHeight
        }, 2000);
    });
 
    // Match with a user
    socket.on('match', function ([user_socket,tags]) {
        console.log($('#msg-container p:first-child'));
        $('#msg-container p:first-child').html('Similar Tags: ' + tags);
    });
 
    function updateMessagesHeight() {
        var msg_height = $("#msg-container").height() - $(".matchmsg").outerHeight() - 55+'px';
        $('#messages').css('height', msg_height);
    }
 
    // Bind the function to the resize event of #matchmsg
    $(window).on('resize', function() {
        updateMessagesHeight();
    });
 
    // Waiting for a match
    socket.on('waiting', function () {
        var prevMsg = $('#msg-container p:first-child').text();
        // console.log(`PREV MSG: ${prevMsg}`);
        if (prevMsg === "Waiting for a match") return;
        // $('#messages').append('<p class="matchmsg">Waiting for a match</p>');
        $("#messages div").remove();
        $("#msg-container p").remove();
        $('#msg-container').prepend('<p class="matchmsg">Waiting for a match</p>');
        updateMessagesHeight();
        // console.log("WAITING WALA CONSOLE",msg_height);
    });
 
    $('.reg-btn').click(() => {
        // console.log("Clicked!!!!");
        pageNum = 1;
        $('#container').html(contentArr[pageNum]);
        attachEventListeners();
    });
 
    $('.sign-in-btn').click(() => {
        // console.log("Clicked!!!!");
        pageNum = 2;
        $('#container').html(contentArr[pageNum]);
        attachEventListeners();
    });
}
 
 
$(document).ready(function () {
    //attach Event Listener
    attachEventListeners();
 
 
    function handlePageUnload() {
        socket.emit('disconnect');
    }
 
    // Handle page unload or navigation
    $(window).on('beforeunload', handlePageUnload);
});
 
 
// chat nav bar
 
$('#nav-btn').hover(
    () => {
        $("#nav-container").css("left", "0px");
    },
    () => {
        $("#nav-container").css("left", "-200px");
    }
);
 
// $('#nav-btn').click(
//     () => {
//         $("#nav-container").css("left", "0px");
//     },
//     () => {
//         $("#nav-container").css("left", "-200px");
//     }
// );
 
$('#nav-container').hover(
    () => {
        $("#nav-container").css("left", "0px");
        $("#nav-btn").css("display","none");
    },
    () => {
        $("#nav-container").css("left", "-200px");
        $("#nav-btn").css("display","flex");
    }
);
 
$(".home-btn-group").hover(
    () => {
        $(".home-btn-label").css({color:"#7c00c7"});
    }
)
// $('#nav-container').click(
//     () => {
//         $("#nav-container").css("left", "0px");
//         $("#nav-btn").css("display","none");
//     },
//     () => {
//         $("#nav-container").css("left", "-200px");
//         $("#nav-btn").css("display","flex");
//     }
// );
 
 
 
 
//  Bubble Effect
$(document).ready(function() {
    function createBubble() {
        const bubbleArr = [
            `<div class = "bubble" id="msg-holdermy"><p class="my1">Hello there 👋</p></div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="my1">Finding a Buddy!<br>Just SIMPLYCHAT 👋</p></div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="other1">Nice to meet You 😊</p></div>`,
            `<div class="emojiBubble bubble">😉</div>`,
            `<div class="emojiBubble bubble"><i class="fa-solid fa-phone" style = "color:blueviolet"></i></div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="my1">Cool 😎</p></div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="my1">An Introvert😜<br> Type just hit 😎</p></div>`,
            `<div class="emojiBubble bubble">😂</div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="other1">Hope we meet soon..😉</p></div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="my1">This Site Rocks..🤘</p></div>`,
            `<div class="emojiBubble bubble"><i class="fa-solid fa-video" style = "color:blueviolet"></i></div>`,
            `<div class="emojiBubble bubble">😎</div>`,
            `<div class = "bubble" id="msg-holdermy"><p class="other1">Let's switch to Video😉</p></div>`,
            `<div class="emojiBubble bubble">😍</div>`,
            `<div class="emojiBubble bubble">😜</div>`,
        ];
        const arrLen = bubbleArr.length;
        const bubbleDiv = bubbleArr[Math.floor(Math.random() * arrLen)];
        const bubble = $(bubbleDiv);
        const duration = Math.floor(Math.random() * 10) + 12; // Random duration between 5 and 13 seconds
        if (bubble.hasClass("emojiBubble")) {
            const size = Math.floor(Math.random() * 40) + 60; // Random size between 80 and 120 pixels
            bubble.css({
                width: size + "px",
                height: size + "px",
                'font-size': Math.max((size - 50),40) + "px"
            });
        }
        // console.log(bubble.width());
        const right = Math.abs(Math.random() * Math.min(50,(($(window).width() - $("#container").width())/2) )); // Random left position
        bubble.css({
            // width: size + "px",
            // height: size + "px",
           
            right: right + "px",
            animationDuration: duration + "s"
        });
       
        bubble.appendTo("#container");
 
        // Set a timeout to remove the bubble after the animation duration
        setTimeout(function() {
            bubble.remove();
        }, duration * 1000); // Convert duration to milliseconds
       
        // Optionally, log animation duration for debugging
        console.log("Animation duration:", duration + "s");
    }
   
    setInterval(createBubble, 4000); // Create a bubble every 3 seconds
});
 
 
 