/**
 * Development environment settings
 *
 * This file can include shared settings for a production environment,
 * such as API keys or remote database passwords.  If you're using
 * a version control solution for your Sails app, this file will
 * be committed to your repository unless you add it to your .gitignore
 * file.  If your repository will be publicly viewable, don't add
 * any private information to this file!
 *
 */


var sentry = require('@sentry/node');

if(process.env.SENTRY_DNS){
  sentry.init({
    dsn: process.env.SENTRY_DNS,
    environment: process.env.NODE_ENV
  });
}

module.exports = {

  /***************************************************************************
   * Set the default database connection for models in the production        *
   * environment (see config/connections.js and config/models.js )           *
   ***************************************************************************/
  models: {
    datastore: 'default',
    migrate: 'safe'
    // migrate: 'drop'
  },
  test_points:{
    send_email_to_self:{
      flag:true,
      to:'alexjv89@gmail.com',
      cc:'alexjv89@gmail.com',
    }
  },

  datastores: {
    default: {
      adapter: 'sails-postgresql',
      host: process.env.DB_HOST,
      user: process.env.DB_USER, // optional
      password: process.env.DB_PASSWORD, // optional
      database: process.env.DB_DATABASE, //optional
      ssl:  { rejectUnauthorized: false } // ssl enabled but will not throw error for self signed certificates. 
    }
  },
  
  bull: {
    redis: {
      host: process.env.REDIS_BULL_HOST,
      port: process.env.REDIS_BULL_PORT,
      db: process.env.REDIS_BULL_DB,
    }
  },
  // slack_webhook: process.env.SLACK_WEBHOOK,
  mailgun: {
    api_key: process.env.MAILGUN_APIKEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
  metabase:{
    site_url:process.env.METABASE_SITE_URL,
    secret_key:process.env.METABASE_SECRET_KEY,
  },
  // background_secret: process.env.BACKGROUND_SECRET,

  password_reset_secret: process.env.PASSWORD_RESET_SECRET,

  app_url: process.env.APP_URL,

  aws: {
    key: process.env.AWS_ACCESS_KEY,
    secret: process.env.AWS_ACCESS_SECRET,
    region: process.env.AWS_REGION,
    bucket: process.env.AWS_BUCKET,
    // category_model_id: process.env.AWS_CATEGORY_MODEL_ID,
    // prediction_endpoint: process.env.AWS_PREDICTION_ENDPOINT,
    // kms_key_id: process.env.AWS_KMS_KEY_ID
  },

  // api_token_secret: process.env.API_TOKEN_SECRET,

 

  // uploads: {
  //   adapter: require('skipper-s3'),
  //   key: process.env.AWS_ACCESS_KEY,
  //   secret: process.env.AWS_ACCESS_SECRET,
  //   bucket: process.env.AWS_BUCKET,
  //   region: process.env.AWS_REGION
  // },

  // admins: process.env.ADMINS.split(',').map(function(s){return parseInt(s)}),
  admins: [
    'alexjv89@gmail.com',
    'finahas@gmail.com',
    'finahas@mralbert.in',
    'fahim@cashflowy.io',
    'shubhra@cashflowy.io',
    'fahim+testAdmin@cashflowy.io'
  ],

  sentry: sentry,
  
  // session: {
  //   adapter: 'connect-redis',
  //   host: process.env.REDIS_SESSION_HOST,
  //   port: 6379,
  //   db: process.env.REDIS_SESSION_DB,
  // },
  uploads:{
    adapter:require('skipper-disk'),
  },
  
}

