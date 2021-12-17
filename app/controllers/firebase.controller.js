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

/**
 * @swagger
 * /fireBase/notification/singleuser:
 *   post:
 *     tags:
 *       - Notification
 *     name: Send notification
 *     summary: Send notification to single user.
 *     consumes:
 *       - application/json
 *     requestBody:
 *       description: Add body to your notification with token.
 *       required: true
 *       content:
 *        application/json:
 *         schema:
 *           type: object
 *           properties:
 *             title:
 *               type: string
 *             messagebody:
 *               type: string
 *             registrationToken:
 *               type: string
 *         required:
 *           - title
 *           - messagebody
 *           - registrationToken
 *     responses:
 *       200:
 *         description: Notification was send
 *       500:
 *         description: Internal Server Error
 *       409:
 *         description: Something went wrong
 */

app.post('/notification/singleuser', (req, res, next) => {
  console.log(req);
  const options = notificationOptions;

  const messagee = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    token: req.body.registrationToken,
    data: {
      Nick: 'Mario',
      Room: 'PortugalVSDenmark',
    },
  };
  console.log(req.body.messagebody);
  fireNotification(messagee, res);
  //admin.messaging().send(messagee)
  //    .then((response) => {
  //        res.status(200).send(`Notification sent successfully${response}`);
  //    })
  //    .catch((error) => {
  //        console.log(error);
  //        next(error);
  //    });
});

app.post('/notification/multiuser', (req, res, next) => {
  // const registrationTokens = [
  // 'YOUR_REGISTRATION_TOKEN_1',
  // …
  // 'YOUR_REGISTRATION_TOKEN_N',
  // ];
  const registrationTokens = req.body.arrayOfFCMToken;
  const messagee = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    data: { score: '850', time: '2:45' },
    tokens: registrationTokens,
  };

  admin
    .messaging()
    .sendMulticast(messagee)
    .then(response => {
      res.status(200).send(`${response.successCount}Notification sent successfully`);
    })
    .catch(error => {
      console.log(error);
      res.status(201).send(`Could not send Notification`);
    });
});

// Send Notification to All Devices
app.post('/notification/orderupdatenotification', (req, res, next) => {
  // The topic name can be optionally prefixed with "/topics/".
  const topicName = req.body.channelId;
  const message = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    android: {
      notification: {
        icon: 'https://media.giphy.com/media/l0Ex3vQtX5VX2YtAQ/source.gif',
        color: '#7e55c3',
        priority: 'high',
      },
    },
    topic: topicName,
    data: {
      orderId: req.body.orderId,
      pageId: req.body.pageId,
      userId: req.body.userId,
      click_action: 'message',
    },
    apns: {
      headers: {
        'apns-priority': '5',
      },
      payload: {
        aps: {
          category: 'NEW_MESSAGE_CATEGORY',
        },
      },
    },
    webpush: {
      headers: {
        TTL: '86400',
      },
    },
  };
  // Send a message to devices subscribed to the provided topic.
  admin
    .messaging()
    .send(message)
    .then(response => {
      // Response is a message ID string.
      res.status(200).send(`${response}Notification sent successfully`);
    })
    .catch(error => {
      console.log('Error sending message:', error);
      res.status(201).send(`Error sending message${error}`);
    });
});

// Send Notification to All Devices
app.post('/notification/notifytopics', (req, res, next) => {
  // The topic name can be optionally prefixed with "/topics/".
  const topicName = 'general';
  const message = {
    notification: {
      title: req.body.title,
      body: req.body.messagebody,
    },
    android: {
      notification: {
        icon: 'https://media.giphy.com/media/l0Ex3vQtX5VX2YtAQ/source.gif',
        color: '#7e55c3',
        priority: 'high',
      },
    },
    topic: topicName,
    data: {
      volume: '3.21.15',
      contents: 'http://www.news-magazine.com/world-week/21659772',
      image: 'https://media.giphy.com/media/l0Ex3vQtX5VX2YtAQ/source.gif',
    },
    apns: {
      headers: {
        'apns-priority': '5',
      },
      payload: {
        aps: {
          category: 'NEW_MESSAGE_CATEGORY',
        },
      },
    },
    webpush: {
      headers: {
        TTL: '86400',
      },
    },
  };
  // Send a message to devices subscribed to the provided topic.
  admin
    .messaging()
    .send(message)
    .then(response => {
      // Response is a message ID string.
      res.status(200).send(`${response}Notification sent successfully`);
    })
    .catch(error => {
      console.log('Error sending message:', error);
      res.status(201).send(`Error sending message${error}`);
    });
});

app.get('/sendsms', (req, res, next) => {
  admin.auth().verifyPhoneNumber('9870897390');
});

function fireNotification(messagee, res) {
  admin
    .messaging()
    .send(messagee)
    .then(response => {
      res.status(200).send(`Notification sent successfully${response}`);
    })
    .catch(error => {
      console.log(error);
      res.status(201).send(`Notification was not sent successfully${error}`);
    });
}

app.post('/notification/categorynotification', (req, res, next) => {
  const topicName2 = req.body.topicsName;
  const message2 = {
    data: {
      title: req.body.title,
      body: req.body.messagebody,
      click_action: req.body.actionname,
      priority: 'high',
      large_icon: 'ic_launcher',
      orderId: req.body.orderId,
      pageId: req.body.pageId,
      userId: req.body.userId,
    },
    condition: `'${topicName2}' in topics`,
    apns: {
      headers: {
        'apns-priority': '10',
      },
    },
  };
  admin
    .messaging()
    .send(message2)
    .then(response => {
      // Response is a message ID string.
      res.status(200).send(`${response}Notification sent successfully`);
    })
    .catch(error => {
      console.log('Error sending message:', error);
      res.status(201).send(`Error sending message${error}`);
    });
});

module.exports.fireNotification = fireNotification;
module.exports = app;
