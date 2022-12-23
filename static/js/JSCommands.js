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
    document.getElementById('buttonsubmit').addEventListener('click', searching)
});


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("searching").addEventListener('click', searching)
});

function searching() {
    let selectedDate = document.getElementById('calender').value;
    let selectedDate2 = document.getElementById('calender2').value;
    let selectedRoomType = document.getElementById('room_type').value;
    let selectedBeds = document.getElementById('bed_count').value;
    $.ajax({
        url: '/get-data',
        type: 'POST',
        dataType: 'json',
        data: {
            "checkin": selectedDate,
            "checkout": selectedDate2,
            "room_type": selectedRoomType,
            "bed_count": selectedBeds
        },
        success: function (data) {
            $('table tbody').empty()
            for (let i = 0; i < data.length; i++) {
                let item = data[i];
                let row = '<tr>' +
                    '<th scope="row">' + (i + 1) + '</th>' +
                    '<td>' + item.Room + '</td>' +
                    '<td>' + item.Type + '</td>' +
                    '<td>' + item.Number_of_Beds + '</td>' +
                    '<td>' + item.Price + '</td>' +
                    '<td><button id="add-to-cart-button" data-item-index="' + i + '">Add to Cart</button></td>' +
                    '</tr>';
                $('table tbody').append(row);
            }

            // Add click event listener to "Add to Cart" buttons
            $('#add-to-cart-button').click(function () {
                let itemIndex = $(this).data('item-index');
                let item = data[itemIndex];

                // Send request to server-side route to add item to cart
                $.ajax({
                    url: '/add-to-cart',
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        "item": item
                    },
                    success: function (response) {
                        // Item was added to cart successfully
                    },
                    error: function (error) {
                        // An error occurred while adding the item to the cart
                    }
                });
            });
        }
    });
}

// let cart = JSON.parse(localStorage.getItem('cart'));





