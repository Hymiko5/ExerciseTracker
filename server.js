const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const myDB = require('./connenction');
var bodyParser = require('body-parser')
app.use(cors())
app.use(express.static('public'))
app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json())
ObjectID = require('mongodb').ObjectID,


app.route('/api/users').get((req, res) => {
  myDB(async (client) => {
    const myDataBase = await client.db('Excercise_Tracker_DB').collection('users');
    myDataBase.find().toArray(function(err, users) {
      res.json(users.map(user => {
        return { _id: user._id, username: user.username };
      }))
    })
  })
})
  
app.route('/api/users').post((req, res) => {
  const { username } = req.body;
  myDB(async (client) => {
    const myDataBase = await client.db('Excercise_Tracker_DB').collection('users');
        myDataBase.insertOne({ username }, (err, doc) => {
          if(err)res.send(err);
          else {
            myDataBase.findOne({ _id: doc.insertedId}, (err, user) => {
              if(err) res.send(err);
              else res.json({ username: user.username, _id: user._id });
            })
          }
    })
  })
})

app.route('/api/users/:_id/exercises').post((req, res) => {
  const { _id } = req.params;
  let { description, duration, date } = req.body;
  duration = parseInt(duration)
  if(!date){
    date = new Date().toDateString();
  }
  else {
    date = new Date(date).toDateString();
  }
  myDB(async (client) => {
    const myDataBase = await client.db('Excercise_Tracker_DB').collection('users');
    myDataBase.updateOne({ _id: new ObjectID(_id) },
    { $push:
       { log:
         {  description, duration, date }
       }
    }, { new: true }, (err, doc) => {
      if(err) res.send(err);
      else 
      {
        myDataBase.findOne({ _id: new ObjectID(_id) }, function(err, user) {
          res.json({ _id, username: user.username, date, duration, description });
      })  
      }
    })
  })
})

app.route('/api/users/:_id/logs').get((req, res) => {
  const { from, to, limit } = req.query;
  console.log({from, to, limit});
  const { _id } = req.params;
    myDB(async (client) => {
    const myDataBase = await client.db('Excercise_Tracker_DB').collection('users');
  if(!from&&!to&&!limit){
    const pipeline = [
    {$match :{ _id: new ObjectID(_id)} },
    {$project: {
    _id: 1,
    username: 1,
    count: { $size: '$log' },
    log: '$log'
  }}]
    const users = myDataBase.aggregate(pipeline);
    for await (const user of users) {
      res.json(user);
    }
  }
  else if(!limit&&from && to) {
    const pipeline = [
      { $match: { _id: new ObjectID(_id) }  },
      {$project: {
      _id: 1,
      username: 1,
      log: {
        $filter: {
     input: '$log',
     as: 'log',
     cond: { $and: [
        { $gte: [ {$toDate: "$$log.date"}, new Date(from) ] },
        { $lte: [ {$toDate: "$$log.date"}, new Date(to) ] }
      ] } },
  }    
      }
    }]
    const users = myDataBase.aggregate(pipeline);
    for await (const user of users) {
      res.json({ _id: user._id, username: user.username, from, to, count: user.log.length, log: user.log });
    }
  }
    else if(limit && from && to) {
      const pipeline = [
      { $match: { _id: new ObjectID(_id) }  },
      {$project: {
        
      _id: 1,
      username: 1,
      log: { 
        $slice: [{$filter: {
     input: '$log',
     as: 'log',
     cond: { $and: [
        { $gte: [ {$toDate: "$$log.date"}, new Date(from) ] },
        { $lte: [ {$toDate: "$$log.date"}, new Date(to) ] },
      ] },
    } }, parseInt('-' + limit)]
      } 
    }} ]
      
    const users = myDataBase.aggregate(pipeline);
    for await (const user of users) {
      res.json({ _id: user._id, username: user.username, from, to, count: user.log.length, log: user.log });
    }
    }
    else if(limit && !from && !to) {
      const pipeline = [
    {$match :{ _id: new ObjectID(_id)} },
    {$project: {
    _id: 1,
    username: 1,
    log: { $slice:  ['$log', parseInt('-' + limit)] }
  }}]
    const users = myDataBase.aggregate(pipeline);
    for await (const user of users) {
      res.json({ _id: user._id, username: user.username, count: user.log.length, log: user.log });
    }
    }
  })
  
  
})
  
















app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  })



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
