const express = require('express');
const bodyparser = require('body-parser');
const admin = require('firebase-admin');
const serviceAccount = require('../../firebasepermissions.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.firbaseURL,
});

const app = express();
app.use(bodyparser.json());

const notificationOptions = {
  priority: 'high',
  timeToLive: 60 * 60 * 24,
};

app.post('/notification/singleuser', (req, res, next) => {
  const options = notificationOptions;
  const messagee = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    token: req.body.registrationToken,
  };
  console.log(req.body.messagebody);
  admin.messaging().send(messagee)
    .then((response) => {
      res.status(200).send(`Notification sent successfully${ response}`);
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

app.post('/notification/multiuser', (req, res, next) => {
  const registrationTokens = [
    'YOUR_REGISTRATION_TOKEN_1',
    // …
    'YOUR_REGISTRATION_TOKEN_N',
  ];

  const messagee = {
    data: { score: '850', time: '2:45' },
    tokens: registrationTokens,
  };

  admin.messaging().sendMulticast(messagee)
    .then((response) => {
      res.status(200).send(`${response.successCount }Notification sent successfully`);
    })
    .catch((error) => {
      console.log(error);
      next(error);
    });
});

// Send Notification to All Devices
app.post('/notification/notifytopics', (req, res, next) => {
  // The topic name can be optionally prefixed with "/topics/".
  const topicName = 'ReStoreHub';
  const message = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    android: {
      notification: {
        icon: 'stock_ticker_update',
        color: '#7e55c3',
      },
    },
    topic: topicName,
  };
  // Send a message to devices subscribed to the provided topic.
  admin.messaging().send(message)
    .then((response) => {
      // Response is a message ID string.
      res.status(200).send(`${response}Notification sent successfully`);
    })
    .catch((error) => {
      console.log('Error sending message:', error);
      next(error);
    });
});

module.exports = app;
