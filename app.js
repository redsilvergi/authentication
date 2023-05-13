require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

//passport setup 1
app.use(
  session({
    secret: process.env.SESSIONSECRET,
    resave: false,
    saveUninitialized: false,
    // cookie: { secure: true }, // the cookie should only be sent over HTTPS
  })
);

//passport setup 2
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/secretsUserDB");
// mongoose.set("useCreateIndex", true)

const userSchema = mongoose.Schema({
  email: String,
  password: String,
});

//passport setup 3
userSchema.plugin(passportLocalMongoose);

const User = mongoose.model("User", userSchema);

//passport setup 4
passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", (req, res) => {
  console.log(req.user);
  res.render("home");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/secrets", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("secrets", { user: req.user });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", async (req, res) => {
  try {
    req.logout(() => {
      res.redirect("/");
    });
  } catch (e) {
    console.log(e);
  }
});

app.post("/register", async (req, res) => {
  try {
    await User.register(
      new User({ username: req.body.username }),
      req.body.password,
      () => {
        //login right after you register
        passport.authenticate("local")(req, res, () => {
          res.redirect("/secrets");
        });
      }
    );
  } catch (e) {
    console.log(e);
    res.redirect("register");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});
