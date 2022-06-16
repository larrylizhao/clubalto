const Koa = require('koa');
const Router = require('@koa/router');
const app = new Koa();
const router = Router();
const { getAvaliableSlots } = require('./alto');

// check the available slots on specific date, date format: yyyy-mm-dd
router.get('/check/:date', async (ctx, next) => {
    var date = ctx.params.date;
    ctx.response.body = await getAvaliableSlots(date);
    await next();
});

router.get('/', async (ctx, next) => {
    ctx.response.body = '<h1>Index</h1>';
    await next();
});

// add router middleware:
app.use(router.routes())
    .use(router.allowedMethods());

// Only open this when debugging
// app.listen(3000, () => {
//     console.log('App running on port 3000');
// });
// no need for `app.listen()` on Deta, they run the app automatically.
module.exports = app; // make sure to export `app` instance.
