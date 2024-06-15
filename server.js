// importing required modules and functions
const express = require("express");
const fetchMonths = require("./myModules/getMonth"); // importing custom module for getting the current month
const bodyParser = require("body-parser");
const {
  LogInCollection,
  Event,
  Sub_dependencies,
} = require("./myModules/mongod"); // importing MongoDB models
const monthName = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]; // array for month names
const path = require("path");
const bcrypt = require("bcrypt"); // for password hashing
const session = require("express-session");
var passport = require("passport");
const LocalStrategy = require("passport-local").Strategy; // using local strategy for authentication
const mails = require("./myModules/sendMails"); // custom module for sending emails
const cors = require("cors");

//initializing app
const app = express();

//using body-parser as middleware to handle requests
app.use(
  cors({
    origin: "http://localhost:3000", // React app origin
    credentials: true, // Allow credentials (cookies, authorization headers, TLS client certificates)
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

//setting ejs engine in views library
app.set("view engine", "ejs");

//express.static for static css
app.use(express.static("public"));

// creating sessions and secret keys
app.use(
  session({
    secret: "NOHACKERSALLOWED",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 * 24 }, // cookie expires in 24 hours
  })
);

//initialize the passport and session connection to passport
app.use(passport.initialize());
app.use(passport.session());

// request for localhost
app.get("/", (req, res) => {
  //checking authentication
  if (req.isAuthenticated()) {
    res.json({mess:true,user:req.user});
  } else {
    res.json({mess:false}); // redirect to login page if not authenticated
  }
});

// route for home page
app
  .route("/home")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      const data = [];

      async function fetchAndRender() {
        try {
          // Fetching months data
          const result = await fetchMonths();
          data.push(...result);

          // Using a Set to avoid duplicate events
          const eventSet = new Set();

          // Creating promises for events
          const eventPromises = result.map(async (ele) => {
            const year = ele["year"];
            const month = Object.keys(ele)[0];
            const events = await Event.find({ month: month, year: year });
            events.forEach((event) => eventSet.add(JSON.stringify(event))); // Convert to JSON string to ensure uniqueness
          });

          // Resolving all event promises
          await Promise.all(eventPromises);

          // Converting the set back to an array
          const eve = Array.from(eventSet).map((eventStr) =>
            JSON.parse(eventStr)
          );

          if (req.user.userType === "staff") {
            if (req.user.userType === "staff") {
              let subs = [];

              const fetchData = async () => {
                try {
                  const subPromises = req.user.course.map(async (ele) => {
                    const sub = await Sub_dependencies.find({ subject: ele });

                    if (
                      sub &&
                      Array.isArray(sub) &&
                      sub[0] &&
                      sub[0].depSubjects
                    ) {
                      return sub[0].depSubjects;
                    } else {
                      console.error(`depSubjects not found for subject ${ele}`);
                      return [];
                    }
                  });

                  const results = await Promise.all(subPromises);

                  subs = results.flat();
                } catch (error) {
                  console.error("Error fetching sub dependencies:", error);
                }
              };

              (async () => {
                await fetchData();

                // Rendering the response
                res.json({
                  events: JSON.stringify(eve),
                  data: data,
                  user: req.user,
                  depSubs: subs, // Now subs will have the correct values
                });
              })();
            }
          } else {
            res.json({
              events: JSON.stringify(eve),
              data: data,
              user: req.user,
            });
          }
        } catch (error) {
          console.error("Error fetching data:", error);
          res.status(500).send("Internal Server Error");
        }
      }

      // Call the async function to fetch data and render the response
      fetchAndRender();
    } else {
      res.json({ message: "no" }); // Redirect to login if not authenticated
    }
  })
  .post(async (req, res) => {
    if (req.isAuthenticated()) {
      const response = await Event.deleteOne({ _id: req.body.delete });
      res.json(response);
    } else {
      console.log("no auth");
    }
  });

app.route("/about").get((req, res) => {
  if (req.isAuthenticated()) {
    res.render("about"); // render about page if authenticated
  } else {
    res.redirect("/login"); // redirect to login page if not authenticated
  }
});

// route for editing events
app
  .route("/edit")
  .get((req, res) => {
    if (req.isAuthenticated()) {
      if (req.user.userType == "staff")
        res.json({
          user: req.user,
        });
      // render edit page if authenticated user is staff
      else res.redirect("/home"); // redirect to home if authenticated user is not staff
    } else {
      res.redirect("/login"); // redirect to login page if not authenticated
    }
  })
  .post(async (req, res) => {
    // creating new event object
    const event = Event({
      eventType: req.body.eventType,
      year: Number(req.body.eventDate.substr(0, 4)),
      month: monthName[req.body.eventDate.substr(5, 2) - 1],
      date: Number(req.body.eventDate.substr(8, 2)),
      eventTitle: req.body.eventTitle.replace(/'/g, "#").replace(/"/g, "~"), // replacing special characters
      eventDescription: req.body.eventDescription
        .replace(/'/g, "#")
        .replace(/"/g, "~"), // replacing special characters
      faculty_name: req.user.name,
      faculty_email: req.user.email,
      course: req.body.course,
    });

    // getting array of students from database
    const studentsArray = await LogInCollection.find({ userType: "student" });

    // sending emails to students
    mails.sendEmails(studentsArray, event);

    // saving event to database
    event.save();
    res.json(event); // redirecting to home page after adding event
  });

// route for signup page
app
  .route("/signup")
  .get((req, res) => {
    res.render("signup"); // render signup page
  })
  .post(async (req, res) => {
    // checking if passwords match
    if (req.body.password == req.body.confirmPassword) {
      try {
        const checking = await LogInCollection.findOne({
          email: req.body.username,
        });

        if (checking) {
          return res.send("User details already exist."); // user already exists
        } else {
          bcrypt.hash(req.body.password, 10, async (err, hashedPassword) => {
            if (err) {
              console.log(err);
            } else {
              // creating new user data
              const data = {
                name: req.body.name,
                password: hashedPassword,
                rollno: req.body.rollno,
                email: req.body.email,
                Branch: req.body.branch,
                userType: "student",
              };
              // saving user data to database
              const result = await LogInCollection.create(data);
              req.login(result, (err) => {
                console.log(err);
                res.redirect("/home"); // redirect to home page after successful signup
              });
            }
          });
        }
      } catch (error) {
        console.error("Error:", error);
        return res.status(500).send("Internal Server Error");
      }
    } else {
      res.redirect("/signup"); // redirect to signup page if passwords don't match
    }
  });

// route for login page
app.route("/login")
.get((req,res)=>{
  if (req.isAuthenticated()) {
    res.json({mess:true,user:req.user});
  } else {
    res.json({mess:false});
  }
})
.post(passport.authenticate("local"), (req, res) => {
  res.json({ message: "login success", user: req.user });
});

// route for user profile
app
  .route("/profile")
  .get(async (req, res) => {
    if (req.isAuthenticated()) {
      await LogInCollection.findOne({ _id: req.user._id })
        .then((result) => {
          res.json(result); // render user profile page
        })
        .catch((err) => console.log(err));
    } else {
      res.redirect("/login"); // redirect to login page if not authenticated
    }
  })
  .post(async (req, res) => {
    // updating user profile data
    await LogInCollection.findOneAndUpdate(
      { _id: req.user._id },
      {
        name: req.body.edit_name,
        rollno: req.body.edit_roll,
        Branch: req.body.branch,
        email: req.body.edit_email,
      }
    ).then((result) => {
      res.redirect("/profile"); // redirect to user profile page after updating
    });
  });

// logout route
app.get("/logout", function (req, res, next) {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }
    res.json({status:true}); // redirect to home page after logout
  });
});

// configuring passport local strategy
passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    try {
      const check = await LogInCollection.findOne({ email: username });

      if (!check) {
        return cb("User Not Found"); // user not found
      }

      // comparing hashed password
      bcrypt.compare(password, check.password, async (err, result) => {
        if (err) {
          throw err;
        } else {
          if (result) {
            return cb(null, check); // successful authentication
          } else {
            return cb(null, false); // incorrect password
          }
        }
      });
    } catch (error) {
      return cb(error);
    }
  })
);

// passport serialization and deserialization
passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

// listening on port 3000
app.listen(8000);
