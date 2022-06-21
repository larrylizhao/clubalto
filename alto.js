const xml2js = require('xml2js');
const axios = require('axios');
const { getFutureWeekends, getHoursLater } = require('./date');
require('dotenv').config({path: '.env.local'});

const { USER_ID, MASTER_SECRET, USER_TOKEN, APP_ESTATE_ID } = process.env
const status = {
    running: true
};

const notification = (body) => [
    `https://api.day.app/DqhDEw3K2zQtXE4LSKuzS7/%E6%9C%89%E7%90%83%E5%9C%BA%E5%95%A6/${encodeURIComponent(body)}?sound=minuet`
];

async function getTimetable(date) {
    const parser = xml2js.Parser();
    const payload = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/"><soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>http://tempuri.org/ICardAppService/GetAvaliableSessionsByDate</wsa:Action><wsa:To>https://altomobile.hk-cic.com/CardAppService.svc</wsa:To></soap:Header><soap:Body><tem:GetAvaliableSessionsByDate><!--Optional:--><tem:JsonData>{  "UserId" : ${+USER_ID},  "Version" : "1.0.1",  "Language" : 3,  "MasterSecret" : "${MASTER_SECRET}",  "UserToken" : "${USER_TOKEN}",  "ClientType" : 1,  "DateToSearch" : "${date}T00:00:00",  "FacilityId" : 14,  "AppEstateId" : "${APP_ESTATE_ID}",  "DeviceInfo" : "iPhone|15.5|2.0.0"}</tem:JsonData></tem:GetAvaliableSessionsByDate></soap:Body></soap:Envelope>`
    const { data } = await axios.post('https://altomobile.hk-cic.com/CardAppService.svc', payload, {
        headers: {
            'Host': 'altomobile.hk-cic.com',
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Connection': 'keep-alive',
            'SOAPAction': 'http://tempuri.org/ICardAppService/GetAvaliableSessionsByDate',
            'Accept': '*/*',
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Length': 894,
            'User-Agent': 'ALTO%20RES/2.0.0.200824.43 CFNetwork/1333.0.4 Darwin/21.5.0',
        }
    });
    const result = await parser.parseStringPromise(data);
    const [{GetAvaliableSessionsByDateResponse: [{GetAvaliableSessionsByDateResult: [timetable]}]}] = result['s:Envelope']['s:Body']
    const { ResultData } = JSON.parse(timetable);
    return ResultData;
}

async function getAvaliableSlots(date) {
    const timetable = await getTimetable(date);
    return timetable ? timetable
        .filter(({BookType}) => BookType === 0)
        .map(({SessionStartTime, SessionCloseTime, IsBooked, BookCode, SessionMemberPrice}) => ({
            SessionStartTime,
            SessionCloseTime,
            IsBooked,
            BookCode,
            SessionMemberPrice
        })) : [];
}

async function checkAndNotify(timeout, far = false) {
    const weekends = getFutureWeekends(far);
    const availableSlotsMap = new Map();
    const end = getHoursLater(timeout);
    try {
        while(status.running && (availableSlotsMap.size === 0 || new Date() < end)) {
            await sleep(5 * 60 * 1000);
            for (const weekend of weekends) {
                const availableSlot = await getAvaliableSlots(weekend);
                if(availableSlot && availableSlot.length > 0) {
                    availableSlotsMap.set(weekend, availableSlot);
                }
            }
        }
        if(availableSlotsMap.size > 0) {
            const body = getNotifyBody(availableSlotsMap);
            const [{data: first} = {}, {data: second} = {}] = [] = await notify(body);
            return [first, second];
        }
        return [];
    } catch(e) {
        console.log(e);
        return e;
    }
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function getNotifyBody(slotsMap) {
    let body = '';
    for(const [date, slots] of slotsMap) {
        const slotString = slots.reduce((accu, {SessionStartTime, SessionCloseTime}) => `${accu}${SessionStartTime} - ${SessionCloseTime} || `, '');
        body += `${date} - ${slotString} \n`;
    }
    return body;
}

async function notify(body) {
    const notifications = notification(body)
    const result = []
    for(const noti of notifications) {
        result.push(await axios(noti));
    }
    return result;
}

async function book(date, time) {
    const timetable = getTimetable(date);
    const { BookCode } = timetable.find(({SessionStartTime}) => SessionStartTime.substring(11,13) === time);
    //const data = await axios.post();
}

function stop() {
    status.running = false;
}

module.exports = { getAvaliableSlots, checkAndNotify, book };
