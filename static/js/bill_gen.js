document.addEventListener("DOMContentLoaded", () => {
    let table = document.getElementById("inner_table");
    let temp = sessionStorage.getItem("cart");
    temp = JSON.parse(temp);

    // Iterate through the items in the session storage and add them to the table
    for (let key in temp) {
        let item = temp[key];
        let row = table.insertRow();
        let roomTypeCell = row.insertCell();
        let roomNumberCell = row.insertCell();
        let priceCell = row.insertCell();
        let numBedsCell = row.insertCell();
        let checkinCell = row.insertCell();
        let checkoutCell = row.insertCell();
        roomTypeCell.innerHTML = item[0];
        roomNumberCell.innerHTML = item[1];
        numBedsCell.innerHTML = item[2];
        priceCell.innerHTML = item[3];
        checkinCell.innerHTML = item[4];
        checkoutCell.innerHTML = item[5];
    }
    sessionStorage.removeItem("cart");
});

function generatePDF() {
    print()
}