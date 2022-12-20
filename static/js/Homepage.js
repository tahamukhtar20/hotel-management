document.getElementById("submit_signup").addEventListener("click", () => {
    console.log("signup clicked")
    let firstname = document.getElementById("firstname").value
    let lastname = document.getElementById("lastname").value
    let email = document.getElementById("exampleInputEmail1").value
    let calender = document.getElementById("calender").value
    let password = document.getElementById("exampleInputPassword1").value
    let password2 = document.getElementById("exampleInputPassword2").value
    if (firstname === "" || lastname === "" || calender === "" || email === "" || password === "" || password2 === "") {
        alert("Please fill all the fields");
    } else if (password.length < 8) {
        alert("Password must be at least 8 characters long");
    } else if (password !== password2) {
        alert("Passwords do not match");
    } else {
        let data = {
            "firstname": firstname,
            "lastname": lastname,
            "email": email,
            "calender": calender,
            "password": password
        }
        let url = "http://localhost:5000/signup"
        // send data to server and authenticate
        let xhr = new XMLHttpRequest();
        xhr.onload = function () {
            if (this.readyState === 4 && this.status === 200) {
                let json = xhr.responseText;
                console.log(json);
            }
        };
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.send(JSON.stringify(data));


    }
});

