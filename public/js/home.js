let username;

function attachEventListeners1() {
  $("#chatButton").click(function () {
    var gender = $("#gender").val();
    var tags = $("#tags").val().toLowerCase().split(/[,]+/);

    const data = { username, gender, tags };

    $.ajax({
      url: "/chat",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify(data),
      success: function (response) {
        // Handle successful response
        console.log("Success:", response);

        // Redirect to the chat page if needed
        window.location.href = "/chat";
      },
      error: function (xhr, status, error) {
        // Handle error
        console.error("Error:", error);
      },
    });
  });
}

$(document).ready(function () {
  
  const urlParams = new URLSearchParams(window.location.search);
  username = urlParams.get("username");

  attachEventListeners1();

});
