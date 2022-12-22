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


// let originalBGplaypen = $("#playpen").css("background-color"),
//     x, y, xy, bgWebKit, bgMoz,
//     lightColor = "#483F78",
//     gradientSize = 130;
//
// // Basic Demo
// $('#playpen').mousemove((e) => {
//
//     x = e.pageX - this.offsetLeft;
//     y = e.pageY - this.offsetTop;
//     xy = x + " " + y;
//
//     bgWebKit = "-webkit-gradient(radial, " + xy + ", 0, " + xy + ", " + gradientSize + ", from(" + lightColor + "), to(rgba(130,3,98,0.0))), " + originalBGplaypen;
//     bgMoz = "-moz-radial-gradient(" + x + "px " + y + "px 45deg, circle, " + lightColor + " 0%, " + originalBGplaypen + " " + gradientSize + "px)";
//
//     $(this)
//         .css({background: bgWebKit})
//         .css({background: bgMoz});
//
// }).mouseleave(function () {
//     $(this).css({background: originalBGplaypen});
// });


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
    } else if (Password.value.length < 6) {
        alert("Password must be atleast 6 characters long")
    } else {
        fetch("/signup_page", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "name": FirstName.value + " " + LastName.value,
                "dob": DOB.value,
                "email": Email.value,
                "password": Password.value
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


function login() {
    let Email = document.getElementById("InputEmail")
    let Password = document.getElementById("InputPassword")
    if (Email.value === "" || Password.value === "") {
        alert("Please fill all the fields")
    } else if (Password.value.length < 6) {
        alert("Password must be atleast 6 characters long")
    } else {
        fetch("/login_page", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "username": Email.value,
                "password": Password.value
            })
        }).then(response => {
            if (response.status === 200) {
                alert("Logged in successfully")
                window.location = response.url;
            }
            return response.json();
        });
    }
}


function logout() {
    fetch("/logout", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    }).then(response => {
        if (response.status === 200) {
            alert("Logged out")
            window.location = response.url;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('logout_id').addEventListener('click', logout)
});
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submit_signup').addEventListener('click', signup)
});
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login_submit').addEventListener('click', login)
});

function updateCalendar() {
    let selectedDate = document.getElementById('calender').value;

    let minDate = new Date(selectedDate);
    minDate.setDate(minDate.getDate() + 1);
    document.getElementById('calender2').min = minDate.toISOString().substr(0, 10);
    document.getElementById('calender2').value = document.getElementById('calender2').min;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('buttonsubmit').addEventListener('click', search)
});

function search() {
    let start_date = document.getElementById("calender")
    let end_date = document.getElementById("calender2")
    let bed_count = document.getElementById("bed_count")
    let room_type = document.getElementById("room_type")
    fetch("/searching", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "start_date": start_date.value,
            "end_date": end_date.value,
            "bed_count": bed_count.value,
            "room_type": room_type.value
        })
    }).then(response => {
        if (response.status === 200) {
            window.location = response.url;
        }
        return response.json();
    });
}


