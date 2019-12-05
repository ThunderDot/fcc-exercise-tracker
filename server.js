const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const cors = require("cors");

const mongoose = require("mongoose");
mongoose.set("useNewUrlParser", true);
mongoose.connect(
  process.env.MONGO_URI,
  {
    useUnifiedTopology: true
  } || "mongodb://localhost/exercise-track"
);
var Schema = mongoose.Schema;

app.use(cors());

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.use(express.static("public"));
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});

// new Shema
var LogType = new Schema(
  {
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: Date, default: Date.now }
  },
  { _id: false }
);

var UserType = new Schema({
  log: [LogType],
  username: String
});
var User = new mongoose.model("User", UserType);
var NewLog = new mongoose.model("Log", LogType);

// ADD NEW USER
app.post("/api/exercise/new-user", function(req, res) {
  User.findOne({ username: req.body.username }, function(err, data) {
    var newUser = new User({ username: req.body.username });
    !data
      ? newUser.save(function(err, data) {
          if (err) return console.error(err);
          res.json({ _id: newUser._id, username: newUser.username });
          return data;
        })
      : res.send("Username already exist");
  });
});

// ADD LOG
app.post("/api/exercise/add", function(req, res) {
  var lognew, error;
  var reqobj = req.body;

  !reqobj.date ? delete reqobj.date : null;
  lognew = new NewLog(reqobj);
  error = lognew.validateSync();

  User.findById(req.body.userId, function(err, data) {
    if (err) {
      res.json({ success: false, err });
      res.end();
      return;
    }
    //console.log(data)
    data
      ? !error
        ? (data.log.push(lognew),
          data.save(),
          (reqobj.username = data.username),
          res.json(reqobj))
        : res.send(error.message)
      : res.send("userId not found, try again");
  });
});

// Query user
app.get("/api/exercise/log?", function(req, res) {
  !req.query.userId
    ? res.send("ERROR: userId is required")
    : User.findById(req.query.userId, function(err, data) {
        if (err) return res.json({ succes: false, err });
        var filterlog;
        !data
          ? res.send("ERROR: userId not found")
          : (filterlog = data.log.filter(function(x) {
              var aproved, startDate, endDate;

              req.query.from
                ? (startDate = new Date(req.query.from))
                : (startDate = new Date(0));
              req.query.to
                ? (endDate = new Date(req.query.to))
                : (endDate = new Date());

              x.date >= startDate && x.date <= endDate ? (aproved = x) : false;
              return aproved;
            }));
        req.query.limit > 0 ? filterlog.splice(req.query.limit) : null;
        var newObject = Object.assign({}, data._doc);
        newObject.log = Object.assign({}, filterlog);
        res.json(newObject);
      });
});

// Not found middleware
app.use((req, res, next) => {
  return next({ status: 404, message: "not found" });
});

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage;

  if (err.errors) {
    // mongoose validation error
    errCode = 400; // bad request
    const keys = Object.keys(err.errors);
    // report the first validation error
    errMessage = err.errors[keys[0]].message;
  } else {
    // generic or custom error
    errCode = err.status || 500;
    errMessage = err.message || "Internal Server Error";
  }
  res
    .status(errCode)
    .type("txt")
    .send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
