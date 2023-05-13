require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const md5 = require("md5");

const app = express();

console.log("weak password hash: " + md5("1234"));
console.log(
  "strong password hash: " +
    md5("asdfasdfdsafqghbq6`5456426$%$sdfsdfHJKHSJFHDSF78324")
);

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

mongoose.connect("mongodb://127.0.0.1:27017/secretsUserDB");

const userSchema = mongoose.Schema({
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.get("/", (q, s) => {
  s.render("home");
});

app.get("/register", (q, s) => {
  s.render("register");
});

app.get("/login", (q, s) => {
  s.render("login");
});

app.post("/register", async (q, s) => {
  try {
    const newUser = new User({
      email: q.body.username,
      password: md5(q.body.password),
    });
    const result = await newUser.save();
    console.log("register completed", result);
    s.render("secrets");
  } catch (e) {
    console.log(e);
  }
});

app.post("/login", async (q, s) => {
  const userName = q.body.username;
  const passwordInput = md5(q.body.password);

  const foundUser = await User.findOne({ email: userName });
  if (foundUser) {
    if (foundUser.password === passwordInput) {
      s.render("secrets");
    } else {
      console.log("login failed");
      s.render("login");
    }
  } else {
    console.log("login failed");
    s.render("login");
  }
});

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});
