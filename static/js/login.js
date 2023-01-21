
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('login_submit').addEventListener('click', login)
});

function login() {
    let Email = document.getElementById("InputEmail")
    let Password = document.getElementById("InputPassword")
    if (Email.value === "" || Password.value === "") {
        alert("Please fill all the fields")
    } else if (Password.value.length < 6) {
        alert("Password must be atleast 6 characters long")
    } else {
        fetch("/login_page", {
            method: "POST", headers: {
                "Content-Type": "application/json"
            }, body: JSON.stringify({
                "username": Email.value, "password": Password.value
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
