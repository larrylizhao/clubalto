const Koa = require('koa');
const Router = require('@koa/router');
const app = new Koa();
const router = Router();
const { getAvailableSlots, checkAndNotify, checkForFutureWeekends, book, stop } = require('./alto');
const DATEREG = /^\d{4}-\d{2}-\d{2}$/;
const status = require('./status').getInstance();

// Check the available slots on specific date, date format: yyyy-mm-dd
router.get('/check/:date', async (ctx, next) => {
    const { params: { date } } = ctx;
    if(DATEREG.test(date)) {
        ctx.body = await getAvailableSlots(date);
    } else {
        ctx.body = {
            message: 'Date format should be yyyy-mm-dd'
        }
    }
    await next();
});

// Check availability of next two weekends
router.get('/future-weekends', async (ctx, next) => {
    ctx.body = await checkForFutureWeekends();
    await next();
});

// Check availability of next two weekends periodically and notify if there's any slots
router.get('/notify/:timeout', async (ctx, next) => {
    if(status.isRunning()) {
        ctx.body = {
            message: 'Already checking, please stop the process before starting new checking process.',
            status: status.getStatus()
        }
    } else {
        const { params: { timeout }, query: { far = false } } = ctx;
        if(/\d{1,2}/.test(timeout) && timeout > 0 && timeout < 15) {
            checkAndNotify(timeout, far);
            ctx.body = {
                message: `Start checking for ${timeout} hours and will notify you if there's available slots.`,
                status: status.getStatus()
            }
        } else {
            ctx.body = {
                message: 'timeout should be number from 1 - 14'
            }
        }
    }
    await next();
});

// Stop the check and notify process directly
router.get('/stop', async (ctx, next) => {
    status.stop();
    ctx.body = {
        message: `Checking stopped.`,
        status: status.getStatus()
    }
    await next();
});

router.get('/status', async (ctx, next) => {
    ctx.body = {
        status: status.getStatus()
    }
    await next();
});

// Book a slot on a certain date
router.get('/book/:date/:time', async (ctx, next) => {
    const { params: { date, time } } = ctx;
    if(DATEREG.test(date) && /\d{2}/.test(time)) {
        ctx.body = await book(date, time);
    } else {
        ctx.body = {
            message: 'Please input valid date and time. date in format yyyy-mm-dd, time ranges from 08 - 21'
        };
    }
    await next();
});

router.get('/', async (ctx, next) => {
    ctx.body = `<h1>Started since ${new Date().toLocaleString('en-US', {timeZone: "Asia/Hong_Kong", timeStyle: 'medium', dateStyle: 'long'})}</h1>`;
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
