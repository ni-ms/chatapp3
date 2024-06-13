import SocketManager from "./socketManager.js";


let socket;

async function fetchChatData() {
  return new Promise((resolve, reject) => {
    $.ajax({
      type: "GET",
      url: "http://localhost:3000/chatData",
      success: function(response) {
        console.log("AJAX request succeeded:", response);
        resolve(response.chatData);
      },
      error: function(xhr, status, error) {
        console.error("AJAX request failed:", status, error);
        reject(error);
      }
    });
  });
}

let chatDataPromise = (async () => {
  return await fetchChatData();
})();

var sendMessageFunc = () => {
  var message = $("#messageInput").val();
  $("#messages").append(
    '<div id="msg-holdermy"><p class="my1"> You: ' + message + "</p></div>"
  );
  socket.emit("message", message);
  $("#messageInput").val("");
  $("#messages").animate(
    {
      scrollTop: $("#messages").get(0).scrollHeight,
    },
    2000
  );
};

function updateMessagesHeight() {
  var msg_height =
    $("#msg-container").height() - $(".matchmsg").outerHeight() - 55 + "px";
  $("#messages").css("height", msg_height);
}

function attachEventListeners2() {
  $("#messageInput").keypress(function (event) {
    if (event.which === 13) {
      sendMessageFunc();
    }
  });

  // Send a message
  $("#sendButton").click(function () {
    sendMessageFunc();
  });

  // Skip the current match
  $("#skipButton").click(function () {
    if (socket) {
      socket.emit("skip");
    } else {
      console.log(`Error while emitting skip. Socket ID NOT FOUND`);
    }
  });

  // Bind the function to the resize event of #matchmsg
  $(window).on("resize", function () {
    updateMessagesHeight();
  });

  // chat nav bar

  $("#nav-btn").hover(
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

  $("#nav-container").hover(
    () => {
      $("#nav-container").css("left", "0px");
      $("#nav-btn").css("display", "none");
    },
    () => {
      $("#nav-container").css("left", "-200px");
      $("#nav-btn").css("display", "flex");
    }
  );

  $(".home-btn-group").hover(() => {
    $(".home-btn-label").css({
      color: "#7c00c7",
    });
  });
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
}


$(document).ready(async function () {
  // console.log(JSON.stringify(chatData));

  //attach Event Listener
  socket = SocketManager.connect();
  
  try {
    const chatData = await chatDataPromise;
    console.log("Chat data is available:", chatData);
    socket.emit("register", {
      gender: chatData.gender,
      tags: chatData.tags,
    });
    // Use chatData as needed
  } catch (error) {
    console.warn("Failed to fetch chat data:", error);
  }

  if (socket) {
    socket.on("connect", function () {
      console.log(`Socket ID: ${socket.id} connected`);
    });

    // Receive a message

    socket.on("message", function (message) {
      $("#messages").append(
        '<div id="msg-holderother"><p class="other1"> Other: ' +
          message +
          "</p></div>"
      );
      $("#messages").animate(
        {
          scrollTop: $("#messages").get(0).scrollHeight,
        },
        2000
      );
    });

    // Match with a user
    socket.on("match", function ([user_socket, tags]) {
      console.log($("#msg-container p:first-child"));
      $("#msg-container p:first-child").html("Similar Tags: " + tags);
    });

    // Waiting for a match
    socket.on("waiting", function () {
      console.log("waiting call receive kr rha");
      var prevMsg = $("#msg-container p:first-child").text();
      // console.log(`PREV MSG: ${prevMsg}`);
      if (prevMsg === "Waiting for a match") return;
      // $('#messages').append('<p class="matchmsg">Waiting for a match</p>');
      $("#messages div").remove();
      $("#msg-container p").remove();
      $("#msg-container").prepend(
        '<p class="matchmsg">Waiting for a match</p>'
      );
      updateMessagesHeight();
      // console.log("WAITING WALA CONSOLE",msg_height);
    });

    socket.on("disconnect", function () {
      console.log(`Disconnected from server ID: ${socket.id}`);
    });

  } else {
    console.log(`CHAT.JS ERROR: SOCKET NOT FOUND`);
  }

  attachEventListeners2();
});
