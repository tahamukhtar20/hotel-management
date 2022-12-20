from flask import Flask, render_template, redirect, url_for, request, make_response
from flask_mysqldb import MySQL

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://username:password@host:port/database'
app.config['MYSQL_HOST'] = 'localhost'
app.config['MYSQL_USER'] = 'your_username'
app.config['MYSQL_PASSWORD'] = '***REMOVED***'
app.config['MYSQL_DB'] = 'your_database'

mysql = MySQL(app)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/signup_page", methods=["GET"])
def signup():
    return render_template("Signup.html")


@app.route("/login_page", methods=['GET'])
def login_page():
    return render_template("Login_page.html")


@app.route("/homepage", methods=["GET"])
def home():
    return render_template("Home_page.html")


if __name__ == '__main__':
    app.run(debug=True)
