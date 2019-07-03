// ==============================================================================
// DEPENDENCIES
// ==============================================================================
    
    // SERVER, MODEL AND FRAMEWORK NEEDS
    var express = require("express");
    var bodyParser = require("body-parser"); // *TODO:* From wk14 homework -- do I still need this?!
    var exphbs = require("express-handlebars");
    var logger = require("morgan");
    var mongoose = require("mongoose");

    // SCRAPING TOOLS
    var axios = require("axios");
    var cheerio = require("cheerio");

    // REQUIRE MODELS
    var db = require("./models");

// ==============================================================================
// EXPRESS AND ROUTING MIDDLEWARE CONFIGURATION
// ==============================================================================

    // CALL EXPRESS, SET PORT
    var app = express();
    var PORT = process.env.PORT || 8081;
    var router = express.Router();
    app.use(router);

    var routes = require('./routes/routes.js'); // *TODO:* From wk14 homework -- different way to do this?!
    router.use('/', routes);

    // Use morgan logger for logging requests -- use default setting of 'dev'
    app.use(logger("dev"));

    // Parse request body
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());
    app.use(bodyParser.urlencoded({ extended: false })); // *TODO:* From wk14 homework -- do I still need this?!

    // Set Handlebars as default engine
    app.engine('handlebars', exphbs({defaultLayout: 'main'}));
    app.set('view engine', 'handlebars');

    // Make "public" a static folder
    app.use(express.static(__dirname + "/public"));

    // create a 404 path if I screw up the code
    // app.use(function (req, res) {
    //     const err = new Error("Something's weird... I can't find what you're looking for!");
    //     err.status = 404;
    //     res.json(err);
    // });

    // Connect to the Mongo DB
    mongoose.connect("mongodb://localhost/mongoHeadlines", { useNewUrlParser: true }, function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log("mongoDB connection has been made!");
        }
    });

    // Connect db to production (for Heroku)
    var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";
    mongoose.connect(MONGODB_URI);

// ================================================================================
// SCRAPING ROUTES  
// ================================================================================

    // for default landing page, show only non-saved results
    app.get("/", function (req, res) {
        db.Article.find({saved: false}) // look for 'saved' property
            .then(function(dbArticles) {
                res.render("home", {articles: dbArticles});
            })
            .catch(function(err) {
                console.log(err);
            });
    });

    // for saved page, show only saved results (if any)
    app.get("/saved", function (req, res) {
        db.Article.find({saved: true})
           .then(function(savedArticles) {
               res.render("saved", {articles: savedArticles});
           })
           .catch(function(err) {
               console.log(err);
           });
    });

    // a GET route for scraping Dodo's site
    app.get("/scrape", function (req, res) {

        // use axios to get html body
        axios.get("https://www.thedodo.com/").then(function(response) {

            // load html body into cheerio and save it to $
            var $ = cheerio.load(response.data);

            // get every h2 within div "double-column-listing__title"
            $("div.double-column-listing__link-wrapper").each(function (i, element) {

                // save results into an empty array
                var result = {};

                // add the text and href of every link and save them as properties on the 'result' object
                result.title = $(this)
                    .find("h2")
                    .text();
                result.link = $(this)
                    .children("a")
                    .attr("href");
                result.summary = $(this)
                    .find("p")
                    .text();
                console.log(element);

                // create a new Article using the 'result' object built from scraping
                db.Article.create({ title, link, summary })
                    .then (function(inserted) {
                        res.redirect("/");
                    })
                    .catch(function(err) {
                        console.log(err);
                    });
                });
        });
    }); // end of get all scrape

    // route to get all Articles from the db
    app.get("/articles", function (req, res) {

        // get every document in the Articles collection
        db.Article.find({})
            .then(function(dbArticle) {

                // if we find Articles, send them to client
                res.json(dbArticle);
            })
            .catch(function(err) {
                res.json(err);
            });
    });

    // route to get a specific Article by id, and populate it with its note
    app.get("/articles/:id", function (req, res) {

        // using id passed in the id paramter, prepare a query that finds the matching item in our db
        db.Article.findOne({ _id: req.params.id })

        // populate all notes associated with found item
        .populate("note")
        .then(function(dbArticle) {
            // if we find an article, send it to the client
            res.json(dbArticle);
        })
        .catch(function(err) {
            res.json(err);
        });
    });

    // // route for saving/updating an Article's associated Note
    // app.post("/articles/:id", function (req, res) {

    //     // create a new Note and pass req.body into the entry
    //     db.Note.create(req.body)
    //         .then(function(dbNote) {
    //             return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id}, { new: true});
    //         })
    //         .then(function(dbArticle) {
    //             // if an Article is successfully updated, send it to the Client
    //             res.json(dbArticle)
    //         })
    //         .catch(function(err) {
    //             res.json(err);
    //         });
    // });

    // delete all articles from db to be able to do a new scrape
    app.get("/deleteall", function (req, res) {
        db.Article.deleteMany({}).then(function(deleted) {})
            .then(function(dbArticle) {
                return db.Note.deleteMany({}); // delete all notes
            })
            .then(function(dbNote) {
                res.redirect("/"); // return user to default landing
            })
            .catch(function(err) {
                console.log(err);
            });
    });

    // save an article and commit to the 'saved' articles
    app.put("/save/:id", function (req, res) {
        db.Article.findOneAndUpdate (
            { _id: req.params.id }, // update by _id
            { $set: { saved: true }} // change property so right articles are seen on the right page
        )
        .then (function(saved) {
            res.json(saved);
        })
        .catch(function(err) {
            console.log(err);
        });
    });

    // delete a single article (which was saved)
    app.delete("/delete/:id", function (req, res) {
        db.Article.deleteOne({ _id: req.params.id}) // delete by article _id
            .then(function(deleted) {
                res.json(deleted);
            })
            .then(function(dbArticle) {
                return db.Note.deleteOne({}); // delete associated note
            })
            .catch(function(err) {
                console.log(err);
            });
    });

    // save a note from scraped articles
    app.post("/savenote/:id", function (req, res) {
        db.Note.create({ note: req.body.note })
            .then(function(dbNote) {
                return db.Article.findOneAndUpdate (
                    { _id: req.params.id },
                    { $push: { notes: dbNote._id }},
                    { new: true}
                )
                .then(function(dbArticle) {
                    res.json(dbArticle);
                })
                .catch(function(err) {
                    console.log(err);
                });
        });
    });

    // delete a note from an article
    app.delete("/deletenote/:id", function (req, res) {
        db.Note.deleteOne({ _id: req.params.id })
            .then(function(deleted) {
                res.json(deleted);
            })
            .catch(function(err) {
                console.log(err);
            });
    });

    // retrieve notes associated to a specific Article
    app.get("/notes/:id", function (req, res) {
        db.Article.findOne ({ _id: req.params.id })
            .populate("notes")
            .then(function(dbArticle) {
                res.json(dbArticle);
            })
            .catch(function(err) {
                console.log(err);
            });
    });



//=============================================================================
// LISTENER
// =============================================================================

app.listen(PORT, function() {
    console.log("App listening on PORT: " + PORT);
  });