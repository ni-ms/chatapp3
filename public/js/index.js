//HTML CONTENT
const contentArr = [
  `
        <div class = "registration" id="home-page">
            <div id="sign-up-header">
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
            <button class="hit-btn" id="signin-btn" class="btn btn-primary">Sign In</button>
            <div id="signreg-stmt">New User? <span class="reg-btn">Register</span> to make
            friends</div>
        </div>`,
  `<div class = "registration" id="sign-up">
        <div id="sign-up-header">
            <h2>Register</h2>
        </div>
        <div class = "signup-form">
            <div class="signup-group" id="name-signup-group">
                <label for="name">Name</label>
                <span class="signup-group-span">:</span>
                <input type="text" id="name" class="signup-control">
            </div>
            <div class="signup-group" id="username-signup-group">
                <label for="username">Username</label>
                <span class="signup-group-span">:</span>
                <input type="text" id="username" class="signup-control">
            </div>
            <div class="signup-group" id="emailid-signup-group">
                <label for="emailid">Email ID</label>
                <span class="signup-group-span">:</span>
                <input type="text" id="emailid" class="signup-control">
            </div>
            <div id="dob-signup-group">
                <label for="dob">DOB</label>
                <span class="signup-group-span">:</span>
                <div id = "dob-box">
                    <input class="dob-input" type="text" id="dob" placeholder = "DD">
                    <span>/</span>
                    <input class="dob-input" type="text" id="dob" placeholder = "MM">
                    <span>/</span>
                    <input class="dob-input" type="text" id="dob" placeholder = "YYYY">
                </div>
            </div>
            <div class = "signup-group">
                <label>Gender</label>
                <span class="signup-group-span">:</span>
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
            <div class="signup-group" id="password-signup-group">
                <label for="password">Password</label>
                <span class="signup-group-span">:</span>
                <input type="text" id="password" class="signup-control">
            </div>
        </div>
        <button class = "hit-btn" id="register-btn" class="btn btn-primary">Register</button>
        <div id="signreg-stmt">Already an User? <span class="sign-in-btn">Sign in</span><div>
        </div>`,
];

function attachEventListeners() {
  let flag = false;

  //select jquery
  $(".dropdown").click(function (event) {
    if ($(event.target).closest(".dropdown-menu").length) return;
    // console.log("DROPDOWN CLICKED");
    $(this).attr("tabindex", 1).focus();
    if (flag) {
      $.when($(this).find(".dropdown-menu").slideToggle(300)).done(() => {
        $(this).css({
          "border-radius": "15px",
        });
      });
    } else {
      $(this).css({
        "border-radius": "15px 15px 0px 0px",
      });
      setTimeout(() => {
        $(this).find(".dropdown-menu").slideToggle(300);
      }, 300);
    }
    flag = !flag;
  });

  // Register SIGN-IN
  $("#register-btn").click(function () {
    const name = $("#name").val();
    const username = $("#username").val();
    const emailid = $("#emailid").val();
    const dobDay = $('#dob-box input[placeholder="DD"]').val();
    const dobMonth = $('#dob-box input[placeholder="MM"]').val();
    const dobYear = $('#dob-box input[placeholder="YYYY"]').val();
    const dob = `${dobYear}-${dobMonth}-${dobDay}`;
    const gender = $("#gender-form-group .select span").text();
    const password = $("#password").val();

    const data = { name, username, emailid, dob, gender, password };

    console.log(`Register Form filled with ${data}`);

    $.ajax({
      url: "http://localhost:3000/register",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (result) {
        console.log(data);
        console.log(result.message);
      },
      error: function (xhr, status, error) {
        console.log(data);
        console.error("Error:", error);
        console.log("An error occurred while registering the user.");
      },
    });
  });

  $("#signin-btn").click(function () {
    const username = $("#username").val();
    const password = $("#password").val();
    const data = { username, password };
    $.ajax({
      url: "http://localhost:3000/check-username",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (response) {
        if (response.exists) {
          window.location.href =
            "/home?username=" + encodeURIComponent(username);
        } else {
          alert(`Username ${username} does not exist`);
        }
      },
      error: function (xhr, status, error) {
        console.error(`Error checking username ${username}:`, error);
      },
    });
  });

  $(".sign-in-btn").click(function () {
    $("#container").html(contentArr[0]);
  });

  $(".reg-btn").click(function () {
    $("#container").html(contentArr[1]);
  });

  $(".dropdown").focusout(function () {
    $.when($(".dropdown-menu").slideUp(500)).done(function () {
      $(".dropdown").css({
        "border-radius": "15px",
      });
      flag = false;
    });
  });

  $(".dropdown-menu li").click(function () {
    $.when($(".dropdown-menu").slideToggle(300)).done(() => {
      $(".dropdown").css({
        "border-radius": "15px",
      });
      $(".dropdown").find("span").text($(this).text());
      $(".dropdown").find("input").attr("value", $(this).attr("id"));
      flag = false;
    });
  });

  /*End Dropdown Menu*/

  // Go to chat page

  $("#home-btn").click(function () {
    $("#container").html(contentArr[0]);
    attachEventListeners();
  });

  $(".reg-btn").click(() => {
    // console.log("Clicked!!!!");
    $("#container").html(contentArr[1]);
    attachEventListeners();
  });

  $(".sign-in-btn").click(() => {
    // console.log("Clicked!!!!");
    $("#container").html(contentArr[0]);
    attachEventListeners();
  });
}

$(document).ready(function () {
  //attach Event Listener
  attachEventListeners();
});

//  Bubble Effect
$(document).ready(function () {
  let interval;
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
        "font-size": Math.max(size - 50, 40) + "px",
      });
    }
    const right = $("#chat1").width() / 2 - 30; // Random left position
    // console.log($('#chat').width());
    bubble.css({
      // width: size + "px",
      // height: size + "px",

      right: right + "px",
      animationDuration: duration + "s",
    });

    bubble.appendTo("#BubbleBox");

    // Set a timeout to remove the bubble after the animation duration
    setTimeout(function () {
      bubble.remove();
    }, duration * 1000); // Convert duration to milliseconds

    // Optionally, log animation duration for debugging
    // console.log("Animation duration:", duration + "s");
  }
  const startInterval = () => {
    interval = setInterval(createBubble, 4000);
  };

  const stopInterval = () => {
    clearInterval(interval);
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopInterval();
    } else {
      startInterval();
      // setSlide(idx); // Ensure the slide continues immediately
    }
  });

  startInterval();

  // setInterval(createBubble, 4000); // Create a bubble every 3 seconds
});

// Carousel Javascript

$(document).ready(() => {
  const slides = [
    `<div class="feature__slide">
    <div class="feature__slide__number feature-items">
        <div class="featureHead" style="text-align:left;font-size: 2rem;padding-left:5%;">Make</div>
        <div class="featureHead" style="text-align:center;font-size: 2rem;">Online</div>
        <div class="featureHead" style="text-align:right;font-size: 2rem;     margin-bottom: 7vh;">Friends</div>
        <img class="slide-img" id = "slide1-img" src="../images/slide1.png">
    </div>
</div>`,
    `<div class="feature__slide">
    <div class="feature__slide__number feature-items">
        <div class="featureHead" style="width:100%;text-align: center;
        margin-top: 10px;
        margin-left: 5px;
        margin-bottom: 8vh;
        font-size: 1.5rem;">End-to-End Encryption</div>
        <img class="slide-img" id = "slide1-img" src="../images/slide2.png" style="margin-bottom: 8vh;">
        <div class="featureHead" style="text-align:center;font-size:1.3rem;">Safe & Secure</div>
    </div>
</div>`,
    `<div class="feature__slide">
    <div class="feature__slide__number feature-items">
        <div class="featureHead" style="margin-top:5vh; font-size:1.75rem">Chat Rooms</div>
        <img class="slide-img" id = "slide3-img" src="../images/slide3.png" style="margin-top:8vh; width: 17vw; height:30vh;">
    </div>
</div>`,
    `<div class="feature__slide">
    <div class="feature__slide__number feature-items">
        <div class="featureHead" style="font-size: 1.75rem;
        margin-bottom: 5vh;">Video Chat</div>
        <img class="slide-img" id = "slide4-img" src="../images/slide4.png">
    </div>
</div>`,
  ];

  let container = $(".feature__container");
  container.html(slides[0]);
  let idx = 1;
  let interval;
  let len = slides.length;
  let setSlide = (indx) => {
    // console.log(indx);
    const $fallingDiv = $(container.children().first()).css("left", "10px");
    $(container).append(slides[indx]);
    const $nxtSlide = $(container.children()[1]);
    let nxtWidth = $nxtSlide.width();
    // console.log(`nxtWidth: ${nxtWidth}`);
    $nxtSlide.css(`left`, `-${nxtWidth + 30}px`);
    // console.log($nxtSlide.html());
    $fallingDiv.css("animation", "rotateAndDrop 2s ease-in-out 1s forwards");
    $nxtSlide.css(
      "animation",
      "peek 1s cubic-bezier(0.68, -0.55, 0.25, 1.55) 3s forwards"
    );

    $fallingDiv.on("animationend", function () {
      // console.log($nxtSlide.css(['animation']));
      console.log("Slide continue");
      $(this).remove();
      idx = (indx + 1) % len;
    });
  };

  const startInterval = () => {
    interval = setInterval(() => {
      setSlide(idx);
    }, 6000);
  };

  const stopInterval = () => {
    clearInterval(interval);
  };

  const resetSlides = () => {
    container.empty();
    container.html(slides[0]);
    idx = 1;
    stopInterval();
  };

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      container.empty();
      container.html(slides[0]);
      idx = 1;
      stopInterval();
    } else {
      startInterval();
    }
  });

  $(window).resize(() => {
    if ($(window).width() > 764) {
      resetSlides();
      startInterval();
    } else {
      stopInterval();
    }
  });

  startInterval();
});
