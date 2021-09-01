const express = require('express');
const bodyparser = require('body-parser');
const fbadmin = require('firebase-admin');
const serviceAccount = require('../../firebasepermissions.json');
const app = express();
app.use(bodyparser.json());

function SendNotificationToChannel(channelName, notificationBody) {
  const topicName = channelName;
  const message = {
    notification: notificationBody,
    android: {
      notification: {
        icon: 'stock_ticker_update',
        color: '#7e55c3',
      },
    },
    topic: topicName,
  };
  fbadmin
    .messaging()
    .send(message)
    .then(response => {
      // Response is a message ID string.
      return { isSuccess: true, result: response };
    })
    .catch(error => {
      console.log('Error sending message:', error);
      return { isSuccess: false, result: error };
    });
}

module.exports = { SendNotificationToChannel };
