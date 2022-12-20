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

function myFunction1() {
    document.getElementById("mybtn1").classList.toggle("show");
}

function myFunction2() {
    document.getElementById("mybtn2").classList.toggle("show");
}

function myFunction3() {
    document.getElementById("mybtn3").classList.toggle("show");
}

function myFunction4() {
    document.getElementById("mybtn4").classList.toggle("show");
}

function myFunction5() {
    document.getElementById("mybtn5").classList.toggle("show");
}

window.onclick = function (event) {
    if (!event.target.matches('.dropbtn')) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        var i;
        for (i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

$(function () {

    var originalBGplaypen = $("#playpen").css("background-color"),
        x, y, xy, bgWebKit, bgMoz,
        lightColor = "#483F78",
        gradientSize = 130;

    // Basic Demo
    $('#playpen').mousemove(function (e) {

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

document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('login_welcome').addEventListener('click', function () {
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


document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('signup_welcome').addEventListener('click', function () {
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


document.addEventListener('DOMContentLoaded', function () {
    document.getElementById('booknow_welcome').addEventListener('click', function () {
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


