from datetime import datetime, timedelta
from flask import Flask, render_template, redirect, url_for, request, session, jsonify
from flask_session import Session
import json
import mysql.connector

now = datetime.now()

min_date_str = now.strftime("%Y-%m-%d")
max_date_str = (now + timedelta(days=5)).strftime("%Y-%m-%d")

# Get current date

conn = mysql.connector.connect(
    host="127.0.0.1",
    user="root",
    password="***REMOVED***",
    database="dbs_proj",
    port="3306"
)
app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)
app.secret_key = "***REMOVED***"


@app.route('/cart')
def cart():
    return render_template('cart.html')


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


@app.route("/")
def index():
    return render_template("index.html", delete_bars=True)


#######################################################################################################################
# Homepage
@app.route('/homepage', methods=["GET"])
def homepage():
    if 'username' in session:
        return render_template('Home_page.html', logout_button=True, min_date_str=min_date_str,
                               max_date_str=max_date_str, fixed_bar=True)
    else:
        return redirect(url_for('login_page'))


# Login
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


@app.route("/manager")
def manager():
    return render_template("manager.html", delete_bars=True)


# Signup
@app.route('/signup', methods=['POST'])
def signup():
    return redirect(url_for('login_page'))


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
            "INSERT INTO customer (Customer_name, Customer_email, Customer_password, Customer_DOB) VALUES (%s, %s, %s, %s)",
            (name, email, password, dob))
        conn.commit()
        cur.close()
        return redirect(url_for('login_page'))
    elif request.method == "GET":
        return render_template("Signup.html")


@app.route("/searching", methods=["POST", "GET"])
def searching():
    data = request.get_json()
    print(data)
    start_date = data.get("start_date")
    end_date = data.get("end_date")
    bed_count = data.get("bed_count")
    room_type = data.get("room_type")
    available_rooms = ["R101"]
    return jsonify({"rooms": available_rooms})


#######################################################################################################################
@app.route("/admin", methods=["GET", "POST"])
def admin():
    if request.method == "GET":
        return render_template("_admin_login.html")
    elif request.method == "POST":
        username = request.json.get("username")
        password = request.json.get("password")
        cursor = conn.cursor()
        cursor.execute(
            "SELECT Employee_email, Employee_pass FROM employee WHERE Employee_email = %s AND Employee_pass = %s",
            (username, password))
        # if cursor.fetchone()[]:
        #     cursor.close()
        #     return redirect(url_for("front-desk"))
        cursor.close()
        return False
    return redirect(url_for("admin"))


@app.route("/front-desk")
def front_desk():
    return render_template("front-desk.html")


@app.route("/front_desk", methods=["GET", "POST"])
def front_desk_():
    if request.method == "POST":
        data = request.get_json()
        quantity = data.get("quantity")
        service_type = data.get("services")
        Booking_id = data.get("booking_no")
        cur = conn.cursor()
        cur.execute(f"SELECT service_id from services where service_type = '{service_type}'")
        service_id = cur.fetchone()[0]
        cur.execute(
            f"SELECT * from booked_service where booking_Booking_id = '{Booking_id}' and service_Service_id = '{service_id}'")
        flag = cur.fetchone()
        if flag == None:
            cur.execute(
                f"INSERT INTO booked_service(booking_Booking_id, service_Service_id, Quantity) value ('{Booking_id}','{service_id}','{quantity}')")
            cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
        else:
            cur.execute(
                f"UPDATE booked_service set Quantity = Quantity + '{quantity}' where service_Service_id = '{service_id}' and booking_Boooking_id = '{Booking_id}'")
            cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
        cur.close()
        return jsonify({"success": True})


@app.route("/logout", methods=["POST"])
def logout():
    session.pop('username', None)
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


@app.route('/add-to-cart', methods=['POST'])
def add_to_cart():
    item = request.get_json()['item']

    # Load the JSON file
    with open('cart.json', 'r') as f:
        cart = json.load(f)

    # Add the item to the cart
    cart.append(item)

    # Save the updated cart to the JSON file
    with open('cart.json', 'w') as f:
        json.dump(cart, f)

    return jsonify({'success': True})


@app.route("/data-retrieval", methods=["POST"])
def retrieval_admin_data():
    cur = conn.cursor()
    cur.execute(
        f"SELECT * FROM "
    )
    rows = cur.fetchall()
    cur.close()


@app.route('/service', methods=['POST'])
def service():
    quantity = 5
    service_type = 'BANQUETTE'
    Booking_id = "4"
    cur = conn.cursor()
    cur.execute(f"SELECT service_id from services where service_type = '{service_type}'")
    service_id = cur.fetchone()[0]
    cur.execute(
        f"SELECT * from booked_service where booking_Booking_id = '{Booking_id}' and service_Service_id = '{service_id}'")
    flag = cur.fetchone()
    if flag == None:
        cur.execute(
            f"INSERT INTO booked_service(booking_Booking_id, service_Service_id, Quantity) value ('{Booking_id}','{service_id}','{quantity}')")
        cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
    else:
        cur.execute(
            f"UPDATE booked_service set Quantity = Quantity + '{quantity}' where service_Service_id = '{service_id}' and booking_Boooking_id = '{Booking_id}'")
        cur.execute(f"UPDATE services set Quantity = Quantity - '{quantity}' where service_id = '{service_id}'")
    cur.close()


@app.route('/manager', methods=['POST'])
def get_bookings():
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
    cursor.close()
    print(data1)
    return jsonify(data1)


@app.route('/admin_verification', methods=['POST'])
def admin_verification():
    email = request.json['username']
    password = request.json['password']
    cur = conn.cursor()
    cur.execute(
        f"select Designation from Employee where Employee_email = '{email}' and Employee_pass = '{password}';")
    flag = cur.fetchone()
    if flag == None:
        return jsonify({"success": False})
    else:
        return jsonify(flag)


@app.route('/manager', methods=['GET'])
def manager_redirect():


#######################################################################################################################
if __name__ == "__main__":
    app.run(debug=True)
