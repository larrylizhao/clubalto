// 一天的时间戳(毫秒为单位)
const TIMESTAMP_OF_DAY = 1000*60*60*24;

// 格式化日期 (2016-02-14)
function getFullDate(targetDate) {
    const date = targetDate ? new Date(targetDate) : new Date();

    const year = date.getFullYear();
    let month = date.getMonth() + 1; // getMonth 方法返回 0-11，代表1-12月
    let day = date.getDate();

    month = month > 9 ? month : '0' + month;
    day = day > 9 ? day : '0' + day;

    return year + '-' + month + '-' + day;
}

function getFutureWeekends(far) {
    const today = new Date();
    let dayOfWeek = today.getDay(); // getDay 方法返回0 表示星期天
    dayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;

    const comingSat = getFullDate(+today + (6 - dayOfWeek) * TIMESTAMP_OF_DAY);
    const comingSun = getFullDate(+today + (7 - dayOfWeek) * TIMESTAMP_OF_DAY);
    const nextSat = getFullDate(+today + (13 - dayOfWeek) * TIMESTAMP_OF_DAY);
    const nextSun = getFullDate(+today + (14 - dayOfWeek) * TIMESTAMP_OF_DAY);
    console.log('Next two weeks', [comingSat, comingSun, nextSat, nextSun]);
    return far ? [nextSat, nextSun] :[comingSat, comingSun, nextSat, nextSun];
}

module.exports = {
    getToday: getFullDate(),
    getFutureWeekends
};
