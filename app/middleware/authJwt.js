const jwt = require('jsonwebtoken');

const jwtKey = process.env.JWT_SECRET;
const refreshTokenSecret = process.env.REFRESH_SECRET;

/*eslint-disable */
function verifyToken(req, res, next) {
  // let token = req.headers["x-access-token"];
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader) {
    /*eslint-disable */
    token = authHeader.split(' ')[1];
    console.log(token);
  }

  if (!token) {
    return res.status(403).send({ message: 'No token provided.',isSuccess: false });
  }

  jwt.verify(token, jwtKey, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Unauthorized! Invalid Token',isSuccess: false });
    }
    // req.userId = decoded.id;

    if(decoded.uuid !== req.body.uuid || decoded.username !== req.body.login){
      res.status(401).send({ message: 'Unauthorized! Please check credentials',isSuccess: false });
    }

    next();
  });
}

module.exports = verifyToken;
