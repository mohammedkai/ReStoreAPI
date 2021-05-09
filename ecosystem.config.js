module.exports = {
  apps : [
      {
        name      : 'ReStoreAPI',
        script    : './server.js',
        exec_mode : 'cluster_mode',
        instances : 'max'
      }
      ],
  deploy : {
    production : {
      user : 'node',
      host : '140.238.254.19',
      ref  : 'origin/master',
      repo : 'https://github.com/mohammedkai/Re-StoreApi.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    }
  }
};
