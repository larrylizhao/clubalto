const parser = require('xml2js').Parser();
const axios = require('axios');
const { getFutureWeekends, getHoursLater } = require('./date');
require('dotenv').config({path: '.env.local'});

const { USER_ID, MASTER_SECRET, USER_TOKEN, APP_ESTATE_ID, HOST, SOAP_ACTION_CHECK, SOAP_ACTION_BOOK, USER_AGENT } = process.env
const status = {
    running: true
};

const notification = (body) => [
    `https://api.day.app/DqhDEw3K2zQtXE4LSKuzS7/%E6%9C%89%E7%90%83%E5%9C%BA%E5%95%A6/${encodeURIComponent(body)}?sound=minuet`
];

async function getTimetable(date) {
    const payload = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/"><soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>${SOAP_ACTION_CHECK}</wsa:Action><wsa:To>https://${HOST}/CardAppService.svc</wsa:To></soap:Header><soap:Body><tem:GetAvaliableSessionsByDate><!--Optional:--><tem:JsonData>{  "UserId" : ${+USER_ID},  "Version" : "1.0.1",  "Language" : 3,  "MasterSecret" : "${MASTER_SECRET}",  "UserToken" : "${USER_TOKEN}",  "ClientType" : 1,  "DateToSearch" : "${date}T00:00:00",  "FacilityId" : 14,  "AppEstateId" : "${APP_ESTATE_ID}",  "DeviceInfo" : "iPhone|15.5|2.0.0"}</tem:JsonData></tem:GetAvaliableSessionsByDate></soap:Body></soap:Envelope>`
    const { data } = await axios.post(`https://${HOST}/CardAppService.svc`, payload, {
        headers: {
            'Host': `${HOST}`,
            'Content-Type': 'application/soap+xml; charset=utf-8',
            'Connection': 'keep-alive',
            'SOAPAction': `${SOAP_ACTION_CHECK}`,
            'Accept': '*/*',
            'Accept-Language': 'zh-cn',
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Length': Buffer.byteLength(payload,'ascii'),
            'User-Agent': `${USER_AGENT}`,
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
    status.running = true;
    try {
        while(status.running && (availableSlotsMap.size === 0 || new Date() < end)) {
            for (const weekend of weekends) {
                const availableSlot = await getAvaliableSlots(weekend);
                if(availableSlot && availableSlot.length > 0) {
                    availableSlotsMap.set(weekend, availableSlot);
                }
            }
            await sleep(5 * 60 * 1000);
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
    const timetable = await getTimetable(date);
    if(!timetable) {
        return null;
    } else {
        const { BookCode } = timetable.find(({SessionStartTime}) => SessionStartTime.substring(11,13) === time);
        const payload = `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/"><soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>${SOAP_ACTION_BOOK}</wsa:Action><wsa:To>https://${HOST}/CardAppService.svc</wsa:To></soap:Header><soap:Body><tem:BookFacility><!--Optional:--><tem:JsonData>{  "UserToken" : "${USER_TOKEN}",  "Version" : "1.0.1",  "ClientType" : 1,  "MasterSecret" : "${MASTER_SECRET}",  "UserId" : ${+USER_ID},  "DateToBook" : "${date}T00:00:00",  "HoldBookCodeList" : "N/A",  "DeviceInfo" : "iPhone|15.5|2.0.0",  "Language" : 3,  "FacilityId" : 14,  "BookCodeList" : "${BookCode}",  "AppEstateId" : "${APP_ESTATE_ID}"}</tem:JsonData></tem:BookFacility></soap:Body></soap:Envelope>`;

        try {
            const { data } = await axios.post(`https://${HOST}/CardAppService.svc`, payload, {
                headers: {
                    'Host': `${HOST}`,
                    'Content-Type': 'application/soap+xml; charset=utf-8',
                    'Connection': 'keep-alive',
                    'SOAPAction': `${SOAP_ACTION_BOOK}`,
                    'Accept': '*/*',
                    'Accept-Language': 'zh-cn',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Content-Length': Buffer.byteLength(payload,'ascii'),
                    'User-Agent': `${USER_AGENT}`,
                }
            });
            const result = await parser.parseStringPromise(data);
            const {'s:Envelope': {'s:Body': [{BookFacilityResponse: [{ BookFacilityResult: [bookResult] }]}]}} = result;
            return JSON.parse(bookResult);
        } catch(e) {
            console.log(e);
            const { response: { status, statusText, headers, config, data }  = {}} = e;
            const result = await parser.parseStringPromise(data).catch(e => {return e;});
            const {'s:Envelope': {'s:Body': [{'s:Fault': fault}]}} = result;
            return {
                status,
                statusText,
                headers,
                config,
                fault
            };
        }
    }
}

function stop() {
    status.running = false;
}

module.exports = { getAvaliableSlots, checkAndNotify, book, stop };
