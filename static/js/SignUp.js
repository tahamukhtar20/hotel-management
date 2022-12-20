async function signup() {
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
        fetch("http://localhost:5000/login", {
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
            return response.json();
        }).then(data => {
            if (data.message === "success") {
                alert("Account created successfully")
                sessionStorage.setItem(data.key, data.message);
                // window.location.href = "login.html";

            } else {
                alert("Email already exists")
            }

        });
    }
}