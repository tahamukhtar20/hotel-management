from datetime import datetime, timedelta, date
from flask import Flask, render_template, redirect, url_for, request, session, jsonify
from flask_session import Session
from liveserver import LiveServer
import mysql.connector

now = datetime.now()

min_date_str = now.strftime("%Y-%m-%d")
min_date_str_max = (now + timedelta(days=1)).strftime("%Y-%m-%d")
max_date_str = (now + timedelta(days=5)).strftime("%Y-%m-%d")

conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="***REMOVED***",
    database="dbs_proj",
    port="3306"
)
app = Flask(__name__)
ls = LiveServer(app)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)
app.secret_key = "***REMOVED***"


#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################
#######################################################################################################################


def validate_login(username, password):
    cursor = conn.cursor()
    cursor.execute(
        "SELECT Customer_email, customer_password FROM customer WHERE Customer_email = %s AND Customer_password = %s",
        (username, password))
    if cursor.fetchone() is not None:
        cursor.close()
        return True
    cursor.close()
    return False


#######################################################################################################################

#######################################################################################################################


@app.route("/")
def index():
    return render_template("index.html", delete_bars=True)


#######################################################################################################################

#######################################################################################################################

# Login
@app.route('/login_page', methods=["GET", "POST"])
def login_page():
    if 'username' in session:
        return redirect(url_for('homepage'))
    elif request.method == "POST":
        username = request.json['username']
        password = request.json['password']
        if validate_login(username, password):
            session['username'] = username
            return redirect(url_for('homepage'))
    elif request.method == "GET":
        return render_template('login_page.html')


@app.route('/login', methods=['POST'])
def login():
    username = request.json['username']
    password = request.json['password']
    if validate_login(username, password):
        session["username"] = username
        print(session)
        return redirect(url_for('homepage'))
    else:
        return redirect(url_for('login_page'))


#######################################################################################################################

#######################################################################################################################

# Homepage
@app.route('/homepage', methods=["GET"])
def homepage():
    if 'username' in session:
        return render_template('Home_page.html', logout_button=True, min_date_str=min_date_str,
                               max_date_str=max_date_str, min_date_str_max=min_date_str_max, fixed_bar=True)
    else:
        return redirect(url_for('login_page'))


@app.route("/get-data", methods=["POST"])
def get_data():
    checkin = request.form['checkin']
    checkout = request.form['checkout']
    room_type = request.form['room_type']
    bed_count = request.form['bed_count']
    cur = conn.cursor()
    cur.execute(
        f"SELECT * FROM room WHERE Room_type='{room_type}' AND no_of_beds='{bed_count}' AND Room_no NOT IN (SELECT room_Room_no FROM booked_room WHERE '{checkin}' BETWEEN Check_in AND Check_out OR '{checkout}' BETWEEN Check_in AND Check_out)"
    )
    rows = cur.fetchall()
    cur.close()
    data = []
    for row in rows:
        data.append({
            "Room": row[0],
            "Type": row[1],
            "Number_of_Beds": row[2],
            "Price": row[3]
        })
    return jsonify(data)


#######################################################################################################################

#######################################################################################################################


@app.route('/cart')
def cart():
    return render_template('cart.html')


@app.route('/add-to-cart', methods=['POST'])
def add_to_cart():
    try:
        item = request.json["items"]
        print(item)
        cur = conn.cursor()
        cur.execute(f"Select customer_id from customer where Customer_email='{session['username']}'")
        customer_id = cur.fetchall()
        customer_id = customer_id[0][0]
        print(customer_id)
        conn.commit()
        cur.execute(f"insert into booking (customer_customer_id) values ('{customer_id}')")
        conn.commit()
        cur.execute(
            f"select booking_id from booking where customer_customer_id='{customer_id}' order by booking_id desc limit 1")
        booking_id = cur.fetchone()
        print(booking_id)
        booking_id = booking_id[0]
        print(booking_id)
        for key, value in item.items():
            print(key, value)
            Check_in_date = value[4]
            Check_out_date = value[5]
            room_Room_no = key
            cur.execute(
                f"insert into booked_room(booking_Booking_id, Check_in, Check_out, room_Room_no) value ('{booking_id}', '{Check_in_date}','{Check_out_date}','{room_Room_no}')")
        cur.execute(f"call room_price_insertion('{booking_id}');")
        conn.commit()
        cur.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(e)
        pass


@app.route('/bill')
def bill():
    return render_template('bill_Generation.html')


#######################################################################################################################

#######################################################################################################################

@app.route("/manager")
def manager():
    cursor = conn.cursor()
    cursor.execute(
        "SELECT Booking_id, Customer_name, Customer_email, Check_in, Check_out FROM booking, customer, booked_room WHERE booking_Booking_id = Booking_id AND Customer_id = booking.customer_Customer_id AND curdate() BETWEEN Check_in AND Check_out")
    bookings = cursor.fetchall()
    data1 = []
    data = []
    for row in bookings:
        data.append({
            "Booking_id": row[0],
            "Customer_name": row[1],
            "Customer_email": row[2],
            "Check_in": str(row[3]),
            "Check_out": str(row[4])
        })
    data1.append(data)
    data = []
    cursor.execute(f"select Employee_id, Employee_name, Designation, Salary from employee order by Employee_id")
    bookings = cursor.fetchall()
    for row in bookings:
        data.append({
            "EmployeeNumber": row[0],
            "Employee": row[1],
            "Designation": row[2],
            "Salary": row[3]
        })
    data1.append(data)
    data = []
    cursor.execute(f"select Employee_id, Employee_name, Designation, Salary from employee order by Employee_id")
    bookings = cursor.fetchall()
    for row in bookings:
        data.append({
            "Date": row[0],
            "Revenue": row[1],
            "Expenses": row[2],
            "Profit": row[3]
        })
    data1.append(data)
    data = []
    cursor.execute(
        f"select DMY, Management_bills, restocking_bill, Salary_expense from hotel_expenses order by DMY desc limit 10")
    bookings = cursor.fetchall()
    for row in bookings:
        data.append({
            "Date": row[0],
            "ManagementBills": row[1],
            "restocking_bill": row[2],
            "Salary_expense": row[3]
        })
    data1.append(data)
    print(data1)
    cursor.close()
    return render_template("manager.html", delete_bars=True, bookings=data1)


#######################################################################################################################

#######################################################################################################################


# Signup
@app.route('/signup', methods=['POST'])
def signup():
    return redirect(url_for('login_page'))


# Signup
@app.route("/signup_page", methods=["GET", "POST"])
def signup_page():
    if "username" in session:
        return redirect(url_for("homepage"))
    elif request.method == "POST":
        name = request.json.get("name")
        dob = request.json.get("dob")
        email = request.json.get("email")
        password = request.json.get("password")
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO customer (Customer_name, Customer_email, Customer_password, Customer_DOB) VALUES (%s, %s, "
            "%s, %s)",
            (name, email, password, dob))
        conn.commit()
        cur.close()
        return redirect(url_for('login_page'))
    elif request.method == "GET":
        return render_template("Signup.html")


#######################################################################################################################

#######################################################################################################################

@app.route('/admin_verification', methods=['POST'])
def admin_verification():
    email = request.json['Email']
    password = request.json['Password']
    print(email, password)
    cur = conn.cursor()
    cur.execute(
        f"select Designation from Employee where Employee_email = '{email}' and Employee_pass = '{password}'")
    flag = cur.fetchone()[0]
    print(flag)
    if flag == 'Manager':
        session['Manager'] = email
        return redirect(url_for("manager"))
    elif flag == 'Front Desk':
        session['FrontDesk'] = email
        return redirect(url_for("front_desk"))
    else:
        pass  # TODO: add condition for alerting that wrong password has been entered


@app.route('/admin')
def admin_render():
    session.pop('username', None)
    # TODO: add session conditions here
    return render_template("_admin_login.html")


#######################################################################################################################

#######################################################################################################################

@app.route("/front-desk", methods=["GET"])
def front_desk():
    return render_template("front-desk.html")


def status_generation(check_in, check_out):
    if check_in > date.today():
        return "Upcoming"
    else:
        return "Ongoing"


@app.route("/front-desk-data")
def front_desk_data():
    cur = conn.cursor()
    cur.execute(
        f"select Booking_id, Customer_name, room_Room_no, check_in, check_out from customer, booking, booked_room where Customer_id = customer_Customer_id AND Booking_id = booking_Booking_id AND((curdate() between check_in and check_out) or (curdate() <= check_in));")
    __booking__data__ = cur.fetchall()
    print(__booking__data__)
    cur.close()
    data = []
    for row in __booking__data__:
        data.append({
            "Booking_id": row[0],
            "Customer_name": row[1],
            "Room_no": row[2],
            "Check_in": str(row[3]),
            "Check_out": str(row[4]),
            "Status": status_generation(row[3], row[4])
        })
    return jsonify(data)



@app.route("/front-desk-data/add-service", methods=["POST"])
def front_desk_data_add_service():
    data = request.get_json()
    quantity = data.get("quantity")
    service_type = data.get("services")
    Booking_id = data.get("booking_no")
    cur = conn.cursor()
    cur.execute(f"SELECT service_id from services where service_type = '{service_type}'")
    service_id = cur.fetchone()
    if service_id is None:
        return jsonify({"success": False, "error": "Invalid service type"})
    service_id = service_id[0]
    cur.execute(
        f"select room_Room_no from booked_room where booking_Booking_id = '{Booking_id}' and curdate() between Check_in and Check_out")
    flag1 = cur.fetchone()
    if flag1 is None:
        return jsonify({"success": False, "error": "Invalid booking id"})
    else:
        cur.execute(
            f"SELECT * from booked_service where booking_Booking_id = '{Booking_id}' and service_Service_id = '{service_id}'")
        flag = cur.fetchone()
        if flag is None:
            cur.execute(
                f"INSERT INTO booked_service(booking_Booking_id, service_Service_id, Quantity) value ('{Booking_id}','{service_id}','{quantity}')")
            cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
            cur.execute(
                f"INSERT INTO restocking (services_Service_id, restock_quantity) VALUES ('{service_id}', '{quantity}') "
                f"ON DUPLICATE KEY UPDATE restock_quantity = restock_quantity + '{quantity}'")
        else:
            cur.execute(
                f"UPDATE booked_service set Quantity = Quantity + '{quantity}' where service_Service_id = '{service_id}' and booking_Booking_id = '{Booking_id}'")
            cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
            cur.execute(
                f"INSERT INTO restocking (services_Service_id, restock_quantity) VALUES ('{service_id}', '{quantity}') "
                f"ON DUPLICATE KEY UPDATE restock_quantity = restock_quantity + '{quantity}'")
        conn.commit()
        cur.close()
        return jsonify({"success": True})


@app.route("/front-desk-data/<int:booking_id>", methods=["DELETE"])
def front_desk_delete(booking_id):
    try:
        cur = conn.cursor()
        cur.execute(
            f"SELECT DMY FROM generated_revenue WHERE DMY = CURDATE()")
        if cur.fetchone() != None:
            cur.execute(
                f"UPDATE generated_revenue SET Room_booking_amount = Room_booking_amount - (SELECT Room_amount FROM booking WHERE Booking_id = '{booking_id}') WHERE DMY = CURDATE();")
        else:
            cur.execute(
                f"INSERT INTO generated_revenue (DMY, Room_booking_amount) VALUES (CURDATE(), (SELECT -1*Room_amount FROM booking WHERE Booking_id = '{booking_id}'));")
        cur.execute(
            f"delete from booked_room where booking_Booking_id = '{booking_id}'")
        conn.commit()
        cur.execute(
            f"delete from booking where Booking_id = '{booking_id}'")
        conn.commit()
        cur.close()
        return jsonify({"status": "success"})
    except Exception as e:
        print(e)
        return '', 404


def retrieve_services(booking_id):
    cur = conn.cursor()
    cur.execute(f"select service_type , booked_service.Quantity , price_for_sale , (booked_service.Quantity*price_for_sale) as Total from booked_service,services where service_Service_id = Service_id and booking_Booking_id = '{booking_id}';")
    services = cur.fetchall()
    cur.close()
    return services


@app.route('/generate-bill', methods=['GET', 'POST'])
def generate_bill():
    if request.method == 'POST':
        booking_id = request.form['bookingId']
        services = retrieve_services(booking_id)
        print(services)
        return jsonify(services)
    else:
        return render_template('services_bill.html')


# TODO: Make sure the booking getting the service is being selected
#       Handle the POST request on the front end so that the services get booked against an event made by a button

#######################################################################################################################

#######################################################################################################################

@app.route("/logout", methods=["POST"])
def logout():
    session.pop('username', None)
    return redirect(url_for('login_page'))


@app.route("/admin_logout", methods=["POST"])
def admin_logout():
    session.pop("admin", None)
    redirect(url_for('admin_render'))


#######################################################################################################################

#######################################################################################################################
if __name__ == "__main__":
    ls.run()
