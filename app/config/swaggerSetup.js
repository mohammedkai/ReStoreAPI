exports.swaggerSetup = {
  swaggerDefinition: {
    openapi: '3.0.0',
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
    info: {
      title: 'Node APP SWAGGER API',
      version: '1.0.0',
      description: 'ReStore api layer for documenting the apis and testing them.',
    },
    servers: [
      {
        url: 'http://140.238.254.19:8080/',
      },
      {
        url: 'http://localhost:8080/',
      },
    ],
  },
  apis: ['./app/routes/**.js', './app/controllers/**.js'],
};
