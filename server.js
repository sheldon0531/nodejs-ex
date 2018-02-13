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
    console.log("Initialize MongoDB!");
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
    res.render('index.html', { pageCountMessage : count, dbInfo : dbDetails});
    });
  } else {
    //console.log("DB not exists!");
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

app.get('/graph', function(req, res) {
  res.render('graph.html');
});

app.get('/tabledata', function(req, res) {
  res.json(ioArray);
});
app.get('/arrayIdx', function(req, res) {
  res.json(arrayIndex);
});
app.get('/chart', function(req, res) {
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var chartData;
    chartData = new Array(2);
    chartData[0] = new Array(4);  //OI Ration
    chartData[1] = new Array(4);  //Time Period
    for (var i=0;i<2;i++){
      for (var j=0;j<4;j++){
        chartData[i][j]= new Array();
      }
    }
    var col = db.collection('ledger');
    var cursor = col.find().sort({"date": -1}).limit(240);
    cursor.each(function(err, item) {
      // If the item is null then the cursor is exhausted/empty and closed
      if(item == null) {
        // Show that the cursor is closed
        cursor.toArray(function(err, items) {
          assert.ok(err != null);
          // Let's close the db
          db.close();
        });
      } else{
        chartData[0][0].unshift(cursor.tag1W[0]);
        chartData[1][0].unshift(cursor.tag1W[1]);
        chartData[0][1].unshift(cursor.tag2W[0]);
        chartData[1][1].unshift(cursor.tag2W[1]);
        chartData[0][2].unshift(cursor.tag4W[0]);
        chartData[1][2].unshift(cursor.tag4W[1]);
        chartData[0][3].unshift(cursor.tag8W[0]);
        chartData[1][3].unshift(cursor.tag8W[1]);        
      }

    });
    res.json(chartData);
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
var currMin,currHour;
const maxArrayIndex = 80000;
const startTime= Date.now();
var txs;
//console.log('Declaration End.')
currMin=new Date().getMinutes()-1;
currHour=new Date().getHours()-1;
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
    var mins = new Date().getMinutes();
    var hrs = new Date().getHours();
    if (currMin!=mins && ioArray[0][0]) {
      insertData();
      currMin=mins;
    };
    if (currHour!=hrs && ioArray[0][0]) {
      deleteData();
      currHour=hrs;
    };
    /*
    console.log("***********************************");    
    console.log(Date.now()+" Total txs:"+txs);
    console.log("***********************************");
    console.log(" 1W Index In:"+ioArray[0][0]+" Out:"+ioArray[1][0]+" out-in:"+(ioArray[1][0]-ioArray[0][0])+" out/in:"+(ioArray[1][0]/ioArray[0][0]).toFixed(5)+" in "+(ioArray[2][0]/60).toFixed(1)+" mins");
    console.log(" 2W Index In:"+ioArray[0][1]+" Out:"+ioArray[1][1]+" out-in:"+(ioArray[1][1]-ioArray[0][1])+" out/in:"+(ioArray[1][1]/ioArray[0][1]).toFixed(5)+" in "+(ioArray[2][1]/60).toFixed(1)+" mins");
    console.log(" 4W Index In:"+ioArray[0][2]+" Out:"+ioArray[1][2]+" out-in:"+(ioArray[1][2]-ioArray[0][2])+" out/in:"+(ioArray[1][2]/ioArray[0][2]).toFixed(5)+" in "+(ioArray[2][2]/60).toFixed(1)+" mins");
    console.log(" 8W Index In:"+ioArray[0][3]+" Out:"+ioArray[1][3]+" out-in:"+(ioArray[1][3]-ioArray[0][3])+" out/in:"+(ioArray[1][3]/ioArray[0][3]).toFixed(5)+" in "+(ioArray[2][3]/60).toFixed(1)+" mins");
    //console.log("16W Index In:"+ioArray[0][4]+" Out:"+ioArray[1][4]+" out-in:"+(ioArray[1][4]-ioArray[0][4])+" out/in:"+(ioArray[1][4]/ioArray[0][4]).toFixed(5)+" in "+(ioArray[2][4]).toFixed(1)+" mins");
    */
};

Date.prototype.addDays = function(days) {
  var dat = new Date(this.valueOf());
  dat.setDate(dat.getDate() + days);
  return dat;
}

function insertData(){
  if (!db) {
    console.log("Create DB")
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('ledger');
    console.log("insert data into ledger DB")
    // Create a document with request IP and current time of request
    col.insert({date: Date.now(), tag1W:[ioArray[1][0]/ioArray[0][0],ioArray[2][0]],tag2W:[ioArray[1][1]/ioArray[0][1],ioArray[2][1]],tag4W:[ioArray[1][2]/ioArray[0][2],ioArray[2][2]],tag8W:[ioArray[1][3]/ioArray[0][3],ioArray[2][3]],});
  } 
}

function deleteData(){
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('ledger');
    var dat = new Date();
    dat.addDays(-2);
    col.remove({date:{$lte:dat}});
  } 
}

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