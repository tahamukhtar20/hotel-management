let calender = null;
let calender2 = null;

function checkingData(room) {
    let cart = sessionStorage.getItem("cart")
    cart = JSON.parse(cart)
    return cart[room] !== null;
}

function searching() {
    let selectedDate = document.getElementById('calender').value;
    let selectedDate2 = document.getElementById('calender2').value;
    let selectedRoomType = document.getElementById('room_type').value;
    let selectedBeds = document.getElementById('bed_count').value;
    calender = selectedDate
    calender2 = selectedDate2
    $.ajax({
        url: '/get-data',
        type: 'POST',
        dataType: 'json',
        data: {
            checkin: selectedDate,
            checkout: selectedDate2,
            room_type: selectedRoomType,
            bed_count: selectedBeds
        },
        success: function (data) {
            let tableData = data
                .map((item, i) => ({
                    Room: item.Room,
                    Type: item.Type,
                    Number_of_Beds: item.Number_of_Beds,
                    Price: item.Price,
                    index: i
                }))
            let table = document.getElementById('table_add_cart');
            while (table.firstChild) {
                table.removeChild(table.firstChild);
            }
            for (let i = 0; i < tableData.length; i++) {
                let cart = JSON.parse(sessionStorage.getItem('cart'));
                if (cart && cart[tableData[i].Room]) {
                    continue;
                }
                let row = document.createElement('tr');
                row.innerHTML = `<td>${tableData[i].Room}</td><td>${tableData[i].Type}</td><td>${tableData[i].Number_of_Beds}</td><td>${tableData[i].Price}</td><td><button class="btn btn-primary" id="add_cart" onclick="addToCart('${tableData[i].Room}', '${tableData[i].Type}', '${tableData[i].Number_of_Beds}', '${tableData[i].Price}', this.parentNode.parentNode)">Add to Cart</button></td>`;
                document.getElementById('table_add_cart').appendChild(row);
            }
        }
    });
}

function updateCalendar() {
    let selectedDate = document.getElementById('calender').value;
    let minDate = new Date(selectedDate);
    minDate.setDate(minDate.getDate() + 1);
    document.getElementById('calender2').min = minDate.toISOString().substr(0, 10);
    document.getElementById('calender2').value = document.getElementById('calender2').min;
}

const tbody_ = document.getElementById('table_add_cart');

tbody_.addEventListener('click', function (event) {
    if (event.target.tagName === 'BUTTON') {
        const row = event.target.parentNode.parentNode;
        const cells = row.children;
        const Room = cells[0].textContent;
        const Type = cells[1].textContent;
        const Number_of_Beds = cells[2].textContent;
        const Price = cells[3].textContent;
        addToCart(Room, Type, Number_of_Beds, Price, row);
    }
});

function addToCart(Room, Type, Number_of_Beds, Price, row) {
    let room_no = Room
    let newItem = [Room, Type, Number_of_Beds, Price, calender, calender2]
    if (sessionStorage.getItem('cart')) {
        let cart = JSON.parse(sessionStorage.getItem('cart'));
        cart[room_no] = newItem;
        sessionStorage.setItem('cart', JSON.stringify(cart));
    } else {
        let cart = {};
        cart[room_no] = newItem;
        sessionStorage.setItem('cart', JSON.stringify(cart));
    }
    if (row) {
        row.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById("searching").addEventListener('click', searching)
});
