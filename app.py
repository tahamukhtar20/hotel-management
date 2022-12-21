from flask import Flask, render_template, redirect, url_for, request, session
from flask_session import Session
from flask_mysqldb import MySQL

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@host:port/database'
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'root'
app.config['MYSQL_PASSWORD'] = '***REMOVED***'
app.config['MYSQL_DB'] = 'your_database'
app.config['SECRET_KEY'] = '***REMOVED***'
mysql = MySQL(app)
Session(app)


def validate_login(username, password):
    return True


@app.route("/")
def index():
    return render_template("index.html", delete_bars=True)


#######################################################################################################################
# Homepage
@app.route('/homepage', methods=["GET"])
def homepage():
    if 'username' in session:
        return render_template('Home_page.html')
    else:
        # alert = "Please login first"
        return redirect(url_for('login_page'))


# Login
@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']
    if validate_login(username, password):
        session['username'] = username
        return redirect(url_for('homepage'))
    else:
        return redirect(url_for('login_page'))


# Signup
@app.route('/signup', methods=['POST'])
def signup():
    name = request.form['name']
    email = request.form['email']
    password = request.form['password']
    cur = mysql.connection.cursor()
    cur.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
    mysql.connection.commit()
    cur.close()
    return redirect(url_for('login_page'))


#######################################################################################################################

# Login
@app.route('/login_page', methods=["GET"])
def login_page():
    if 'username' in session:
        return redirect(url_for('homepage'))
    alert = "Already logged in"
    return render_template('login_page.html')


# Signup
@app.route("/signup_page", methods=["GET", "POST"])
def signup_page():
    if session.get("user"):
        return redirect(url_for("homepage"))
    if request.method == "POST":
        # name = request.form.get("name")
        # email = request.form.get("email")
        # password = request.form.get("password")
        # cur = mysql.connection.cursor()
        # cur.execute("INSERT INTO users (name, email, password) VALUES (%s, %s, %s)", (name, email, password))
        # mysql.connection.commit()
        # cur.close()
        return redirect(url_for('login_page'))
    return render_template('Signup.html')

#######################################################################################################################
