document.addEventListener("DOMContentLoaded", () => {
        let cart = document.getElementById("inner_table");
        let temp = sessionStorage.getItem("cart");
        console.log(typeof (temp));
        console.log(temp);
        if (temp !== "{}" && temp !== null) {
            temp = JSON.parse(temp);
            document.getElementById("button_response").innerHTML = `<button type="button" id = "checkout_button" class=" btn btn-primary">Checkout</button>`;
            console.log(temp);
            let count = 0;
            for (let key in temp) {
                count++;
                let item = temp[key];
                let row = cart.insertRow();
                let roomTypeCell = row.insertCell();
                let roomNumberCell = row.insertCell();
                let priceCell = row.insertCell();
                let numBedsCell = row.insertCell();
                let checkinCell = row.insertCell();
                let checkoutCell = row.insertCell();
                let removeCell = row.insertCell();
                roomTypeCell.innerHTML = item[0];
                roomNumberCell.innerHTML = item[1];
                numBedsCell.innerHTML = item[2];
                priceCell.innerHTML = item[3];
                checkinCell.innerHTML = item[4];
                checkoutCell.innerHTML = item[5];
                let removeButton = document.createElement('button');
                removeButton.innerHTML = 'Remove';
                removeButton.classList.add('btn', 'btn-danger');
                removeCell.appendChild(removeButton);
                removeButton.addEventListener('click', function () {
                    delete temp[key];
                    sessionStorage.setItem('cart', JSON.stringify(temp));
                    cart.deleteRow(row.rowIndex - 1);
                    count--;
                    if (count === 0) {

                        document.getElementById("button_response").innerHTML = `<p class = "h1">No Bookings</p>`
                    }
                });
            }
        } else {
            document.getElementById("button_response").innerHTML = `<p class = "h1">No Bookings</p>`
        }
    }
);
let parentElement = document.getElementById("parent-element");
parentElement.addEventListener("click", (event) => {
    let target = event.target;
    if (target.id === "checkout_button") {
        let cart = sessionStorage.getItem("cart");
        cart = JSON.parse(cart);
        let item = {items: cart}
        console.log(JSON.stringify(item))
        $.ajax({
            url: '/add-to-cart',
            type: 'POST',
            dataType: 'json',
            contentType: "application/json",
            data: JSON.stringify(item),
            success: function () {
                window.location.replace("/bill");
            }
        });
    }
});