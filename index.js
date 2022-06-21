const Koa = require('koa');
const Router = require('@koa/router');
const app = new Koa();
const router = Router();
const { getAvaliableSlots, checkAndNotify, book, stop } = require('./alto');
const DATEREG = /^\d{4}-\d{2}-\d{2}$/;

// Check the available slots on specific date, date format: yyyy-mm-dd
router.get('/check/:date', async (ctx, next) => {
    const { params: { date } } = ctx;
    if(DATEREG.test(date)) {
        ctx.body = await getAvaliableSlots(date);
    } else {
        ctx.body = {
            message: 'Date format should be yyyy-mm-dd'
        }
    }
    await next();
});

router.get('/notify/:timeout', async (ctx, next) => {
    const { params: { timeout }, query: { far = false } } = ctx;
    checkAndNotify(timeout, far);
    ctx.body = {
        message: `Start checking for ${timout} hours and will notify you if there's available slots.`
    }
    await next();
});

// Stop the check and notify process directly
router.get('/stop', async (ctx, next) => {
    stop();
    ctx.body = {
        message: `Checking stopped.`
    }
    await next();
});

// Book a slot on a certain date
router.get('/book', async (ctx, next) => {
    const { query: { date, time } } = ctx;
    ctx.body = await book(date, time);
    await next();
});

router.get('/', async (ctx, next) => {
    ctx.body = '<h1>Index</h1>';
    await next();
});

// add router middleware:
app.use(router.routes())
    .use(router.allowedMethods());

// Only open this when debugging
app.listen(3000, () => {
    console.log('App running on port 3000');
});
// no need for `app.listen()` on Deta, they run the app automatically.
module.exports = app; // make sure to export `app` instance.
