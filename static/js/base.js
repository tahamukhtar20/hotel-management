function logout() {
    fetch("/logout", {
        method: "POST", headers: {
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