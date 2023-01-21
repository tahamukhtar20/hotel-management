document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("admin_submit").addEventListener('click', admin_panel)
})


function admin_panel() {
    let Email = document.getElementById("InputEmailAdmin")
    let Password = document.getElementById("InputPasswordAdmin")
    if (Email.value === "" || Password.value === "") {
        alert("Please fill all the fields")
    } else if (Password.value.length < 6) {
        alert("Password must be atleast 6 characters long")
    } else {
        fetch("/admin_verification", {
            method: "POST", headers: {
                "Content-Type": "application/json"
            }, body: JSON.stringify({
                "Email": Email.value, "Password": Password.value
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
    $("#exampleCheck2").click(() => {
        let password = $("#InputPasswordAdmin");
        if (password.attr("type") === "password") {
            password.attr("type", "text");
        } else {
            password.attr("type", "password");
        }
    });
});