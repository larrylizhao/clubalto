const Koa = require('koa');
const Router = require('@koa/router');
const app = new Koa();
const router = Router();
const alto = require('./alto');

// add url-route:
router.get('/check/:date', async (ctx, next) => {
    var date = ctx.params.date;
    ctx.response.body = alto.getSlots(date);
});

router.get('/', async (ctx, next) => {
    ctx.response.body = '<h1>Index</h1>';
});

// add router middleware:
app.use(router.routes())
    .use(router.allowedMethods());

// no need for `app.listen()` on Deta, they run the app automatically.
module.exports = app; // make sure to export `app` instance.
