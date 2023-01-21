window.onload = function () {
    manager_panel();
}

function manager_panel() {
    $.ajax({
        url: '/manager', type: 'POST', success: function (response1) {
            let tbody = $('#bookings tbody');
            let response = response1[1]
            tbody.empty();
            for (let i = 0; i < response.length; i++) {
                let booking = response[i];
                let tr = $('<tr>');
                tr.append($('<td>').text(booking["Booking_id"]));
                tr.append($('<td>').text(booking["Customer_name"]));
                tr.append($('<td>').text(booking["Customer_email"]));
                tr.append($('<td>').text(booking["Check_in"]));
                tr.append($('<td>').text(booking["Check_out"]));
                tbody.append(tr);
            }
            response = response1[0]
            tbody = $('#salaries tbody')
            tbody.empty()
            for (let i = 0; i < response.length; i++) {
                let booking = response[i];
                let tr = $('<tr>');
                tr.append($('<td>').text(booking["EmployeeNumber"]));
                tr.append($('<td>').text(booking["Employee"]));
                tr.append($('<td>').text(booking["Designation"]));
                tr.append($('<td>').text(booking["Salary"]));
                tbody.append(tr);
            }
        }
    });
}