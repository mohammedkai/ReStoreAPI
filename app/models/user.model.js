const oracledb = require('oracledb');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const uuid = require('node-uuid');
const db = require('../dbconnections/oracledb.js');
const connection = require('../dbconnections/db.js');

const saltingRounds = process.env.SALTING_ROUNDS;
let refreshTokens = [];
const jwtKey = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_SECRET;
const getTimeStamp = require('../utils/dateUtil');

// constructor
const User = function (user) {
  this.firstName = user.firstName;
  this.middleName = user.middleName;
  this.lastName = user.lastName;
  this.login = user.login;
  this.isActive = user.isActive;
  this.role = user.role;
  this.password = user.password;
  this.authId = user.authId;
  this.newPassword = user.newPassword;
  this.fcmToken = user.fcmToken;
};

function insertUser(user, callback) {
  const sql = 'INSERT INTO users (FIRST_NAME,MIDDLE_NAME,LAST_NAME,LOGIN,ISACTIVE,ROLE_ID,PASSWORD,UUID) values (:firstname, :middleName, :lastName,:login, :isActive, :role,:password,:uuid)';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        login: user.login,
        isActive: user.isActive,
        role: user.role,
        password: user.password,
        uuid: uuid.v4(),
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, { message: 'User created successfully.', isSuccess: true }); // ALL IS GOOD
      },
    );
  });
}

function authenticateUser(user, callback) {
  const sql = 'Select PASSWORD,UUID from users where login=:login and ISACTIVE=1 ';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        login: user.login,
        // creationDate:new Date().toLocaleString()
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        if (res.rows.length === 0) {
          return callback('No user found');
        }
        return callback(null, res.rows[0]); // ALL IS GOOD
      },
    );
  });
}

function changePassword(user, callback) {
  const sql = 'Update Users set PASSWORD = :password where LOGIN =:login';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        login: user.login,
        password: user.newPassword,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, 'Password Updated'); // ALL IS GOOD
      },
    );
  });
}

function updateLoginTime(user, callback) {
  const sql = "Update Users set LAST_LOGIN = to_timestamp(:currentDate,'MM/DD/YYYY HH24:MI:SS') where LOGIN =:login";
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        login: user.login,
        currentDate: getTimeStamp(),
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, 'Login time updated.'); // ALL IS GOOD
      },
    );
  });
}

function updateFireBaseToken(user, callback) {
  const sql = 'Update Users set FIREBASETOKEN = :fcmToken where LOGIN =:login';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        fcmToken: user.fcmToken,
        login: user.login,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, 'Firebase token updated'); // ALL IS GOOD
      },
    );
  });
}

function getDetails(uuid, callback) {
  const sql = "Select ID,FIRST_NAME,MIDDLE_NAME,LAST_NAME,LOGIN,to_char(LAST_LOGIN,'DD-MM-YYYY HH:MM:SS PM') as LAST_LOGIN from users where UUID=:uuid and ISACTIVE=1 ";
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        uuid,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        if (res.rows.length === 0) {
          return callback('No user found');
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, res.rows[0]); // ALL IS GOOD
      },
    );
  });
}

function deactivateUser(uuid, callback) {
  const sql = 'Update Users set ISACTIVE = 0 where UUID =:uuid';
  db.doConnect((err, connection) => {
    console.log('INFO: Database - Retrieving CURRENT_DATE FROM DUAL');
    if (err) {
      console.log('ERROR: Unable to get a connection ');
      return callback(err);
    }
    db.doExecute(
      connection, sql,
      {
        uuid,
      }, // PASS BIND PARAMS IN HERE - SEE ORACLEDB DOCS
      (err, res) => {
        if (err) {
          db.doRelease(connection); // RELEASE CONNECTION
          return callback(err); // ERROR
        }
        if (res.rowsAffected === 0) {
          return callback('No user found');
        }
        db.doRelease(connection); // RELEASE CONNECTION
        return callback(null, 'User deactivated'); // ALL IS GOOD
      },
    );
  });
}

User.create = function (newUser, result) {
  newUser.password = bcrypt.hashSync(newUser.password, parseInt(saltingRounds, 10));

  insertUser(newUser, (err, res) => {
    if (err) {
      console.log('Error in creating user');
      return result(err);
    }

    result(null, res);
  });
};

User.authenticate = function (newUser, result) {
  authenticateUser(newUser, (err, res) => {
    if (err) {
      console.log('Username does not exist.');
      return result({ message: 'No user found.', status: 404 });
    }

    updateLoginTime(newUser, (err, res) => {
      if (err) {
        console.log('Error in updating User Login Time.');
        return result({ message: 'Error in updating User Login Time.', status: 500 });
      }
    });

    updateFireBaseToken(newUser, (err, res) => {
      if (err) {
        console.log('Error in updating Fire Base Token.');
        return result({ message: 'Error in updating Fire Base Token.', status: 500 });
      }
    });

    const passwordAuth = bcrypt.compareSync(newUser.password, res.PASSWORD); // false

    if (!passwordAuth) {
      return result({ message: 'Authentication failed. Invalid password.', status: 401 });
    }

    const accessToken = jwt.sign({ username: newUser.login }, jwtKey, {
      algorithm: 'HS256',
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign({ username: newUser.login }, refreshTokenSecret, {
      algorithm: 'HS256',
      expiresIn: '30m',
    });
    refreshTokens.push(refreshToken);

    result(null, {
      message: 'Authenticated Successfully',
      isSuccess: true,
      uuid: res.UUID,
      accessToken,
      refreshToken,
    });
  });
};

User.logout = function (token, result) {
  if (!token) {
    result({ message: 'Refresh token cannot be empty.', status: 401 });
  }

  if (!refreshTokens.includes(token)) {
    result({ message: 'Refresh Token Invalid.', status: 403 });
  }
  refreshTokens = refreshTokens.filter((t) => t !== token);
  result(null, { message: 'Logout successful' });
};

User.refreshToken = function (user, result) {
  const token = user.authId;

  if (!token) {
    return result({ message: 'Refresh token cannot be empty.', status: 401 });
  }

  if (!refreshTokens.includes(token)) {
    return result({ message: 'Refresh Token Invalid.', status: 403 });
  }

  jwt.verify(token, refreshTokenSecret, (err, res) => {
    if (err) {
      return result({ message: 'Refresh Token Invalid.', status: 403 });
    }

    const accessToken = jwt.sign({ username: user.login }, jwtKey, { algorithm: 'HS256', expiresIn: '20m' });

    result(null, {
      message: 'New Refresh Token',
      isSuccess: true,
      accessToken,
    });
  });
};

User.updatePassword = function (user, result) {
  authenticateUser(user, (err, res) => {
    if (err) {
      console.log('Username does not exist.');
      return result({ message: 'No user found.', status: 404 });
    }
    const passwordAuth = bcrypt.compareSync(user.password, res.PASSWORD); // false

    if (!passwordAuth) {
      return result({ message: 'Authentication failed. Invalid password.', status: 401 });
    }

    user.newPassword = bcrypt.hashSync(user.newPassword, parseInt(saltingRounds, 10));

    changePassword(user, (err, res) => {
      if (err) {
        console.log('Username does not exist.');
        result({ message: err.message, status: 500 });
      }

      result(null, {
        message: 'Password changed successfully.',
        isSuccess: true,
      });
    });
  });
};

User.getUserDetails = function (uuid, result) {
  getDetails(uuid, (err, res) => {
    if (err) {
      console.log('Username does not exist.');
      return result({ message: 'No user found.', status: 404 });
    }
    result(null, { isSuccess: true, ...res });
  });
};

User.remove = function (uuid, result) {
  deactivateUser(uuid, (err, res) => {
    if (err) {
      console.log('Username does not exist.');
      return result({ message: 'No user found.', status: 404 });
    }
    result(null, {
      message: 'User deactivated successfully.',
      isSuccess: true,
    });
  });
};

module.exports = User;
