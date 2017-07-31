const express = require('express');
const mongodb = require('mongodb');
const validator = require('validator');

'use strict'

const DATABASE_URI = 'mongodb://user:' + process.env.MONGOPASS + '@ds147872.mlab.com:47872/freecodecamp';
const DATABASE_COLLECTION = 'fcc-url-shortener-ms';

const app = express();
app.enable('trust proxy');

let db;

function InsertUniqueShortUrl(url, collection, callback) {
  let shortUrl = Math.floor(100000 + Math.random()*900000);

  collection.findOne({ "short_url" : shortUrl }, function(error, document) {
    if (document) {
      // Future enhancement - regenerate number until we find a unique one
      // Currently though, just error if the random number exists already, 
      // it's unlikely to happen all that often. If it does, the user will be
      // told and can refresh to try again.
      callback(Error("unable to generate short url", null));
    } else {
      collection.save({ 
        "original_url" : url,
        "short_url" : shortUrl,
      }, function(error, record) {
        if (error) {
          callback(error, null);
        } else {
          callback(null, shortUrl);
        }
      });
    }
  })
}

app.get('/favicon.ico', function(request, response) {
  response.status(204).end();
});

app.get('/new/:url(*)', function(request, response) {
  let newUrl = request.params.url;
  if (validator.isURL(newUrl)) {
    let urlCollection = db.collection(DATABASE_COLLECTION);
    InsertUniqueShortUrl(newUrl, urlCollection, function(error, entry) {
      if (error) {
        response.status(500);
        response.send( {"error" : error.message} );
      } else {
        response.status(200);
        response.send({
          "original_url": newUrl,
          "short_url": request.protocol + "://" + request.get('host') + '/' + entry,
        });
      }
    });
  } else {
    response.status(500);
    response.send( {"error" : "not a valid URL"} );
  }
});

app.get('/:shortid', function(request, response) {
  let shortId = request.params.shortid;
  if (validator.isNumeric(shortId)) {
    let urlCollection = db.collection(DATABASE_COLLECTION);
    urlCollection.findOne( { "short_url" : Number(shortId) }, function(error, document) {
      if (document) {
        response.redirect(document["original_url"]);
      } else {
        response.status(500);
        response.send( {"error" : "not a valid short URL"} );
      }
    });
  } else {
    response.status(500);
    response.send( {"error" : "not a valid short URL"} );
  }
});

// Respond not found to all the wrong routes
app.use(function(request, response, next){
  response.status(404);
  response.type('txt').send('Not found');
});

// Error Middleware
app.use(function(error, request, response, next) {
  if(error) {
    response.status(error.status || 500)
      .type('txt')
      .send(error.message || 'SERVER ERROR');
  }  
})

mongodb.MongoClient.connect(DATABASE_URI, function(error, database) {
  if (error) throw error;

  db = database;

  app.listen(process.env.PORT, function () {
    console.log('Node.js listening on ' + process.env.PORT + '...');
  });
});


