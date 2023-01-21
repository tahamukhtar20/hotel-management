function getBookings() {
    $.ajax({
        url: '/front-desk-data',
        type: 'GET',
        success: function (data) {
            console.log(data);
            console.log("here");
            let bookings = data;
            let bookingTableBody = document.getElementById('bookingTableBody');
            bookingTableBody.innerHTML = '';
            for (let i = 0; i < bookings.length; i++) {
                let booking = bookings[i];
                let row = document.createElement('tr');
                console.log(booking);

                // Compare the current date with the check-in and check-out dates
                let currentDate = new Date();
                let checkInDate = new Date(booking["Check_in"]);
                let checkOutDate = new Date(booking["Check_out"]);
                let cancelButtonDisabled = currentDate >= checkInDate && currentDate <= checkOutDate;
                row.innerHTML = `
                        <th scope="row">${booking["Booking_id"]}</th>
                        <td>${booking["Customer_name"]}</td>
                        <td>${booking["Check_in"]}</td>
                        <td>${booking["Check_out"]}</td>
                        <td>
                        <button type="button" class="btn btn-danger" onclick="deleteBooking(${booking["Booking_id"]})" ${cancelButtonDisabled ? "disabled" : ""}>Cancel</button>
                        </td>`;
                bookingTableBody.appendChild(row);
            }
        }
    });
}

function addService() {
    $('#services form').submit(function (event) {
        event.preventDefault();

        let formData = {
            'booking_no': $('#bookingNumber').val(),
            'services': $('#service').val(),
            'quantity': $('#serviceQuantity').val()
        };
        $.ajax({
            type: 'POST',
            url: '/front-desk-data/add-service',
            data: JSON.stringify(formData),
            contentType: 'application/json; charset=utf-8',
            dataType: 'json',
            success: function () {
                $('#services form')[0].reset();
            }
        });
    });
}

function deleteBooking(bookingId) {
    $.ajax({
        url: '/front-desk-data/' + bookingId,
        type: 'DELETE',
        success: function () {
            location.reload();
        }
    });
}


document.addEventListener('DOMContentLoaded', function () {
    getBookings();
    document.getElementById('front_desk_service').addEventListener('click', addService);
    document.getElementById('front_desk_bill').addEventListener('click', generateBill);
});