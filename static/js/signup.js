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
            method: "POST", headers: {
                "Content-Type": "application/json"
            }, body: JSON.stringify({
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


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('submit_signup').addEventListener('click', signup)
});