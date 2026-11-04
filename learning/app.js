'use strict';
const express=require('express');const helmet=require('helmet');const path=require('node:path');
const {createAuthService,createAuthStore}=require('./auth');
const {createLoginRouter,sessionAuthentication}=require('./login-routes');
const {createPortalRouter}=require('./portal-routes');const {createPortalStore}=require('./portal-store');
/** Separate app factory; never mounted by the production server automatically.
 * sendLink must use the project's dedicated, configured transactional sender. */
function createLearningApp({pool,origin,sendLink,onDeliveryError}){
 if(typeof sendLink!=='function')throw new Error('Transactional mail sender required');
 const app=express();app.use(helmet());app.use((_q,s,n)=>{s.set('Cache-Control','no-store');n();});
 const auth=createAuthService({store:createAuthStore(pool),origin});
 app.use('/api/learning/auth',createLoginRouter({auth,origin,sendLink,onDeliveryError,findUser:async email=>{const [[user]]=await pool.execute('SELECT id,email FROM lrn_users WHERE email=?',[email]);return user;}}));
 app.use('/api/learning/me',createPortalRouter({store:createPortalStore(pool),authenticate:sessionAuthentication(auth),origin}));
 app.use('/learning',express.static(path.join(__dirname,'public'),{index:false,etag:false}));
 app.use((error,_req,res,_next)=>{const status=error.status===413?413:error instanceof SyntaxError?400:500;res.status(status).json({error:status===500?'Сервис временно недоступен':'Некорректный запрос'});});
 return app;
}
module.exports={createLearningApp};
