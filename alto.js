const xml2js = require('xml2js');
const axios = require('axios');
const { getNextTwoWeekends } = require('date');
require('dotenv').config({path: '.env.local'});

const { USER_ID, MASTER_SECRET, USER_TOKEN, APP_ESTATE_ID } = process.env

const notification = `curl ''`;

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
    return timetable
        .filter(({BookType}) => BookType === 0 || BookType === 1)
        .map(({SessionStartTime, SessionCloseTime, IsBooked, BookCode, SessionMemberPrice, IsPaid}) => ({
            SessionStartTime,
            SessionCloseTime,
            IsBooked,
            BookCode,
            SessionMemberPrice,
            IsPaid
        }));
}

async function checkAndNotify() {
    const weekends = getNextTwoWeekends();
    const availableSlots = [];
    for (const weekend of weekends) {
        const availableSlot = await getAvaliableSlots(weekend);
        availableSlots.concat()
    }
}

async function book(date, time) {
    const timetable = getTimetable(date);
    const { BookCode } = timetable.find(({SessionStartTime}) => SessionStartTime.substring(11,13) === time);
    //const data = await axios.post();
}

module.exports = { getAvaliableSlots, checkAndNotify, book };
