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

