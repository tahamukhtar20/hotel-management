from datetime import datetime, timedelta
from flask import Flask, render_template, redirect, url_for, request, session, jsonify
from flask_session import Session
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
        if username == "***REMOVED***" and password == "***REMOVED***":
            return redirect(url_for("front-desk"))
        else:
            return redirect(url_for("admin"))


@app.route("/front-desk")
def front_desk():
    return render_template("front-desk.html")


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


#######################################################################################################################
if __name__ == "__main__":
    app.run(debug=True)
