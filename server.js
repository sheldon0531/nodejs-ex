//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
    
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))

var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null && process.env.DATABASE_SERVICE_NAME) {
  var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase(),
      mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'],
      mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'],
      mongoDatabase = process.env[mongoServiceName + '_DATABASE'],
      mongoPassword = process.env[mongoServiceName + '_PASSWORD']
      mongoUser = process.env[mongoServiceName + '_USER'];

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;

  }
}
var db = null,
    dbDetails = new Object();

var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};

app.get('/', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('counts');
    // Create a document with request IP and current time of request
    col.insert({ip: req.ip, date: Date.now()});
    col.count(function(err, count){
      if (err) {
        console.log('Error running count. Message:\n'+err);
      }
      res.render('index.html', { pageCountMessage : count, dbInfo: dbDetails });
    });
  } else {
    res.render('index.html', { pageCountMessage : null});
  }
});

app.get('/pagecount', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;

//Custom code
var WebSocketClient = require('websocket').client;
var client = new WebSocketClient();
//var btcs = new WebSocket('wss://ws.blockchain.info/inv');
var timeforread;
var avg = new Array(3);
var ioArray = new Array(3);
avg[0] = new Array(80000);
avg[1] = new Array(80000);
avg[2] = new Array(80000);
ioArray[0] = new Array(4);
ioArray[1] = new Array(4);
ioArray[2] = new Array(4);
var arrayIndex;
const maxArrayIndex = 80000;
const startTime= Date.now();
var txs;
//console.log('Declaration End.')
client.connect('wss://ws.blockchain.info/inv');
setInterval(caculateData,15000);

function sleep (time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}

function caculateData(){
  var arrayEnd1w,arrayEnd2w,arrayEnd4w//,arrayEnd8w;
    arrayEnd1w = (arrayIndex - 10000) > 0 ? (arrayIndex-10000) : (arrayIndex+70000);
    arrayEnd2w = (arrayIndex - 20000) > 0 ? (arrayIndex-20000) : (arrayIndex+60000);
    arrayEnd4w = (arrayIndex - 40000) > 0 ? (arrayIndex-40000) : (arrayIndex+40000);   
    //arrayEnd8w = (arrayIndex - 80000) > 0 ? (arrayIndex-80000) : (arrayIndex+80000);
    var i = arrayIndex;
    var endPoint = arrayIndex;
    var insum,outsum;
    var lastTimestamp,firstTimestamp;
    insum = 0;
    outsum = 0;
    if (avg[2][i-1]) lastTimestamp = avg[2][i-1];
    do {
      i--;
      if (i<0) i+=maxArrayIndex;
      if (avg[0][i]) {
        insum+= avg[0][i];
        outsum+= avg[1][i];
        firstTimestamp = avg[2][i];
      }
      if (i==arrayEnd1w){
        ioArray[0][0] = insum;
        ioArray[1][0] = outsum;
        ioArray[2][0] = lastTimestamp - firstTimestamp;
      }
      if (i==arrayEnd2w){
        ioArray[0][1] = insum;
        ioArray[1][1] = outsum;
        ioArray[2][1] = lastTimestamp - firstTimestamp;
      }
      if (i==arrayEnd4w){
        ioArray[0][2] = insum;
        ioArray[1][2] = outsum;
        ioArray[2][2] = lastTimestamp - firstTimestamp;
      }
      //if (i==arrayEnd8w){
      //  ioArray[0][3] = insum;
      //  ioArray[1][3] = outsum;
      //  ioArray[2][3] = lastTimestamp - firstTimestamp;
      //}
    } while (i!=endPoint);
    ioArray[0][3] = insum;
    ioArray[1][3] = outsum;
    ioArray[2][3] = lastTimestamp - firstTimestamp;
    console.log("***********************************");    
    console.log(Date.now()+" Total txs:"+txs);
    console.log("***********************************");
    console.log(" 1W Index In:"+ioArray[0][0]+" Out:"+ioArray[1][0]+" out-in:"+(ioArray[1][0]-ioArray[0][0])+" out/in:"+(ioArray[1][0]/ioArray[0][0]).toFixed(5)+" in "+(ioArray[2][0]).toFixed(1)+" mins");
    console.log(" 2W Index In:"+ioArray[0][1]+" Out:"+ioArray[1][1]+" out-in:"+(ioArray[1][1]-ioArray[0][1])+" out/in:"+(ioArray[1][1]/ioArray[0][1]).toFixed(5)+" in "+(ioArray[2][1]).toFixed(1)+" mins");
    console.log(" 4W Index In:"+ioArray[0][2]+" Out:"+ioArray[1][2]+" out-in:"+(ioArray[1][2]-ioArray[0][2])+" out/in:"+(ioArray[1][2]/ioArray[0][2]).toFixed(5)+" in "+(ioArray[2][2]).toFixed(1)+" mins");
    console.log(" 8W Index In:"+ioArray[0][3]+" Out:"+ioArray[1][3]+" out-in:"+(ioArray[1][3]-ioArray[0][3])+" out/in:"+(ioArray[1][3]/ioArray[0][3]).toFixed(5)+" in "+(ioArray[2][3]).toFixed(1)+" mins");
    //console.log("16W Index In:"+ioArray[0][4]+" Out:"+ioArray[1][4]+" out-in:"+(ioArray[1][4]-ioArray[0][4])+" out/in:"+(ioArray[1][4]/ioArray[0][4]).toFixed(5)+" in "+(ioArray[2][4]).toFixed(1)+" mins");
};

  client.on('connectFailed', function(error) {
    console.log('Connect Error: ' + error.toString());
  });
 
  client.on('connect', function(connection) {
    console.log('WebSocket Client Connected');
    arrayIndex=0;
    txs=0;
    connection.send( JSON.stringify( {"op":"unconfirmed_sub"} ) );
    console.log("WebSocket Opened!");

  connection.on('error', function(error) {
        console.log("Connection Error: " + error.toString());
    });

  connection.on('close', function() {
        console.log('echo-protocol Connection Closed');
        sleep(5000);
        client.connect('wss://ws.blockchain.info/inv');
    });
    connection.on('message', function(message) {
      var response = JSON.parse(message.utf8Data);
      txs++;
      avg[0][arrayIndex] = response.x.vin_sz;
      avg[1][arrayIndex] = response.x.vout_sz;
      avg[2][arrayIndex] = response.x.time;
      arrayIndex++;
      if (arrayIndex >= maxArrayIndex) arrayIndex = 0;
      if (txs >= Number.MAX_SAFE_INTEGER) txs = 0;
      timeforread=new Date(response.x.time*1000);
      var startTimeOut = new Date(startTime);

    //$('#times').html("<p>Last txs at " + timeforread +"<br> Total " + txs + " txs Since " + startTimeOut +"</p>");
    });
  });