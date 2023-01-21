$(document).ready(function () {
    let totalCost = 0;
    $('#updateBillButton').click(function () {
        let bookingId = $('#bookingId').val();
        $.ajax({
            url: '/generate-bill',
            type: 'POST',
            data: {bookingId: bookingId},
            success: function (data) {
                let billTableBody = $('#billTableBody');
                billTableBody.empty();
                totalCost = 0;
                console.log(data);
                for (let i = 0; i < data.length; i++) {
                    let service = data[i];
                    let row = $('<tr>');
                    row.append($('<td>').text(service[0]));
                    row.append($('<td>').text(service[1]));
                    row.append($('<td>').text(service[2]));
                    let serviceTotal = service[1] * service[2];
                    totalCost += serviceTotal;
                    row.append($('<td>').text(serviceTotal));
                    billTableBody.append(row);
                }
                $('#totalCost').text(totalCost);
            }
        });
    });
});