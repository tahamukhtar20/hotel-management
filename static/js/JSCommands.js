function sessionValid() {
    let sessionId = sessionStorage.getItem("sessionId");
    if (!sessionId) {
        // If the session ID is not present, the session is not valid
        return false;
    }

    // Check if the session has expired
    let lastRequestTime = sessionStorage.getItem("lastRequestTime");
    let currentTime = new Date().getTime();
    if (currentTime - lastRequestTime > SESSION_EXPIRATION_THRESHOLD) {
        // If the session has expired, clear the session data and return false
        sessionStorage.clear();
        return false;
    }

    // Update the last request time
    sessionStorage.setItem("lastRequestTime", currentTime);

    // If the session ID is present and the session has not expired, the session is valid
    return true;
}

window.onscroll = function () {
    scrollFunction()
};
// if (!sessionValid()) {
//     window.location.href = "login.html";
// }

function scrollFunction() {
    if (document.body.scrollTop > 80 || document.documentElement.scrollTop > 80) {
        document.getElementById("navbar").style.padding = "30px 10px";
        document.getElementById("logo").style.fontSize = "25px";
    } else {
        document.getElementById("navbar").style.padding = "80px 10px";
        document.getElementById("logo").style.fontSize = "35px";
    }
}

$(document).ready(() => {
    $("#exampleCheck1").click(() => {
        let password = $("#InputPassword");
        if (password.attr("type") === "password") {
            password.attr("type", "text");
        } else {
            password.attr("type", "password");
        }
    });
});


$(() => {

    var originalBGplaypen = $("#playpen").css("background-color"),
        x, y, xy, bgWebKit, bgMoz,
        lightColor = "#483F78",
        gradientSize = 130;

    // Basic Demo
    $('#playpen').mousemove((e) => {

        x = e.pageX - this.offsetLeft;
        y = e.pageY - this.offsetTop;
        xy = x + " " + y;

        bgWebKit = "-webkit-gradient(radial, " + xy + ", 0, " + xy + ", " + gradientSize + ", from(" + lightColor + "), to(rgba(130,3,98,0.0))), " + originalBGplaypen;
        bgMoz = "-moz-radial-gradient(" + x + "px " + y + "px 45deg, circle, " + lightColor + " 0%, " + originalBGplaypen + " " + gradientSize + "px)";

        $(this)
            .css({background: bgWebKit})
            .css({background: bgMoz});

    }).mouseleave(function () {
        $(this).css({background: originalBGplaypen});
    });
});

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('signup_welcome').addEventListener('click', () => {
        fetch('/signup_page')
            .then(response => {
                if (response.status === 200) {
                    window.location = response.url;
                }
            })
            .catch(error => {
                console.error(error);
            });
    });
});


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login_welcome').addEventListener('click', () => {
        fetch('/login_page')
            .then(response => {
                if (response.status === 200) {
                    window.location = response.url;
                }
            })
            .catch(error => {
                console.error(error);
            });
    });
});


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('booknow_welcome').addEventListener('click', () => {
        fetch('/homepage')
            .then(response => {
                if (response.status === 200) {
                    window.location = response.url;
                }
            })
            .catch(error => {
                console.error(error);
            });
    });
});

function signup() {
    let FirstName = document.getElementById("firstname")
    let LastName = document.getElementById("lastname")
    let DOB = document.getElementById("Date-of-Birth")
    let Email = document.getElementById("Email1")
    let Password = document.getElementById("Password1")
    let ConfirmPassword = document.getElementById("Password2")
    if (FirstName.value === "" || LastName.value === "" || DOB.value === "" || Email.value === "" || Password.value === "" || ConfirmPassword.value === "") {
        alert("Please fill all the fields")
    } else if (Password.value !== ConfirmPassword.value) {
        alert("Passwords don't match")
    } else if (Password.value.length < 8) {
        alert("Password must be atleast 8 characters long")
    } else {
        fetch("/signup_page", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "firstname": FirstName.value,
                "lastname": LastName.value,
                "DOB": DOB.value,
                "Email": Email.value,
                "Password": Password.value
            })
        }).then(response => {
            if (response.status === 200) {
                alert("Account created successfully")
                window.location = response.url;
            }
            return response.json();

        }).then(data => {
            if (data.message === "success") {
                alert("Account created successfully")
                sessionStorage.setItem(data.key, data.message);
            } else {
                alert("Email already exists")
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submit_signup').addEventListener('click', signup)
});
