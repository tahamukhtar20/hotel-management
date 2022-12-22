from datetime import datetime, timedelta
from flask import Flask, render_template, redirect, url_for, request, session
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


# Use Flask template syntax to render the dates in the HTML


@app.route("/")
def index():
    return render_template("index.html", delete_bars=True)


#######################################################################################################################
# Homepage
@app.route('/homepage', methods=["GET"])
def homepage():
    if 'username' in session:
        return render_template('Home_page.html', logout_button=True, min_date_str=min_date_str,
                               max_date_str=max_date_str)
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
        # else:
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


@app.route("/searching", methods=["POST"])
def searching()
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


#######################################################################################################################
if __name__ == "__main__":
    app.run(debug=True)
