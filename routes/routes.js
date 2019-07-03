// create references to express and router -- *TODO:* From wk14 homework -- do I still need this?!
var express = require("express");
var router = express.Router();

// Paths for the layouts

    // A path for the home page (from the logo link too)
    router.get("/", function (req, res) {
        res.render("home");
    });

    // A path for the "saved" page (from the nav)
    router.get("/saved", function (req, res) {
        res.render("saved");
    });


// export route so import request from server.js will work
module.exports = router; 