'use strict';
function databaseConfig(env=process.env) {
 const database=env.LEARNING_DB_NAME;
 if(!database||! /learning/.test(database)||database===env.DB_NAME)throw new Error('Use a separate LEARNING_DB_NAME containing learning');
 if(!env.LEARNING_DB_USER||!env.LEARNING_DB_PASSWORD)throw new Error('Learning database credentials required');
 return {host:env.LEARNING_DB_HOST||'localhost',port:Number(env.LEARNING_DB_PORT||3306),
  user:env.LEARNING_DB_USER,password:env.LEARNING_DB_PASSWORD,database,
  timezone:'Z',dateStrings:true,charset:'utf8mb4',connectionLimit:5,multipleStatements:false};
}
module.exports={databaseConfig};
