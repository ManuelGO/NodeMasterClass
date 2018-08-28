/**
 * Create an export configuration variables.
 */

 //Container for all variables.

 const environments = {};

 //Staging (default) environment
environments.staging = {
    'httpPort': 3000,
    'httpsPort': 3001,
    'envName': 'staging'
};

 //Production environment

 environments.production = {
     'httpPort': 5000,
     'httpsPort': 5001,
     'envName': 'production'
 };

 //Determine which evironment was passed as command-line argument.
 let currentEnvironment = typeof(process.env.NODE_ENV) === 'string' ? process.env.NODE_ENV.toLowerCase() : '';

 //Check that the current evironment is one of the above, if not, default to staging.
 let environmentToExport = typeof(environments[currentEnvironment]) === 'object' ? environments[currentEnvironment] : environments.staging;

 //Export the module
module.exports = environmentToExport;