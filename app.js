require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static(`${__dirname}`));
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
  username: String,
  password: String,
  googleId: String,
  googleDisplayName: String,
  googleEmail: String,
  secret: String,
});

//passport setup 3
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema);

//passport setup 4
passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id)
    .exec()
    .then((user) => {
      done(null, user);
    })
    .catch((err) => {
      done(err, null);
    });
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.CLIENT_ID,
      clientSecret: process.env.CLIENT_SECRET,
      callbackURL: "http://localhost:3000/auth/google/secrets",
      // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    (accessToken, refreshToken, fetchedData, cb) => {
      // console.log(fetchedData);

      User.findOrCreate(
        {
          googleId: fetchedData.id,
          googleDisplayName: fetchedData.displayName,
          googleEmail: fetchedData._json.email,
        },
        (err, user) => {
          return cb(err, user);
        }
      );
    }
  )
);

app.get("/", (req, res) => {
  console.log(`home log: ${req.user}`);
  res.render("home", { user: req.user });
});

app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

app.get(
  "/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    res.redirect("/secrets");
  }
);

app
  .route("/register")
  .get((req, res) => {
    res.render("register");
  })
  .post((req, res) => {
    try {
      User.register(
        new User({ username: req.body.username }),
        req.body.password,
        () => {
          //login right after you register
          passport.authenticate("local", {
            failureRedirect: "/register",
          })(req, res, () => {
            res.redirect("/secrets");
          });
        }
      );
    } catch (e) {
      console.log(e);
      res.redirect("register");
    }
  });

app
  .route("/login")
  .get((req, res) => {
    res.render("login");
  })
  .post(
    passport.authenticate("local", {
      failureRedirect: "/login",
    }),
    (req, res) => {
      res.redirect("/secrets");
    }
  );

app.get("/secrets", async (req, res) => {
  try {
    const foundUsers = await User.find({ secret: { $ne: null } });
    if (foundUsers) {
      console.log(req.user);
      res.render("secrets", { user: req.user, usersWithSecrets: foundUsers });
    }
  } catch (e) {
    console.log(e);
  }
});

app
  .route("/submit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      res.render("submit");
    } else {
      res.redirect("/login");
    }
  })
  .post(async (req, res) => {
    try {
      console.log("entering patch");
      const submittedSecret = req.body.secret;
      console.log(`submittedSecret: ${submittedSecret}`);
      const foundUser = await User.findById(req.user.id);
      if (foundUser) {
        console.log(`foundUser: ${foundUser}`);
        foundUser.secret = submittedSecret;
        foundUser.save();
        res.redirect("/secrets");
      }
    } catch (e) {
      console.log(e);
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

app.listen(process.env.PORT || 3000, () => {
  console.log("server started");
});
