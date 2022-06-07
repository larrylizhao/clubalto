const util = require('util');
const exec = util.promisify(require('child_process').exec);
const xml2js = require('xml2js');
require('dotenv').config({path: '.env.local'});

const { USER_ID, MASTER_SECRET, USER_TOKEN, APP_ESTATE_ID } = process.env
const checkAvaliableTimeslot = (date) => `curl 'https://altomobile.hk-cic.com/CardAppService.svc'  -H 'Host: altomobile.hk-cic.com'  -H 'Content-Type: application/soap+xml; charset=utf-8'  -H 'Connection: keep-alive'  -H 'SOAPAction: http://tempuri.org/ICardAppService/GetAvaliableSessionsByDate'  -H 'Accept: */*'  -H 'Accept-Language: zh-cn'  -H 'Content-Length: 894'  -H 'Accept-Encoding: gzip, deflate, br'  -H 'User-Agent: ALTO%20RES/2.0.0.200824.43 CFNetwork/1333.0.4 Darwin/21.5.0'   --data '<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:tem="http://tempuri.org/"><soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing"><wsa:Action>http://tempuri.org/ICardAppService/GetAvaliableSessionsByDate</wsa:Action><wsa:To>https://altomobile.hk-cic.com/CardAppService.svc</wsa:To></soap:Header><soap:Body><tem:GetAvaliableSessionsByDate><!--Optional:--><tem:JsonData>{  "UserId" : ${+USER_ID},  "Version" : "1.0.1",  "Language" : 3,  "MasterSecret" : "${MASTER_SECRET}",  "UserToken" : "${USER_TOKEN}",  "ClientType" : 1,  "DateToSearch" : "${date}T00:00:00",  "FacilityId" : 14,  "AppEstateId" : "${APP_ESTATE_ID}",  "DeviceInfo" : "iPhone|15.5|2.0.0"}</tem:JsonData></tem:GetAvaliableSessionsByDate></soap:Body></soap:Envelope>'`;

const notification = `curl ''`;
async function getSlots(date) {
    const parser = xml2js.Parser();
    const { stdout } = await exec(checkAvaliableTimeslot(date));
    const result = await parser.parseStringPromise(stdout);
    const [{GetAvaliableSessionsByDateResponse: [{GetAvaliableSessionsByDateResult: [timetable]}]}] = result['s:Envelope']['s:Body']
    const { ResultData } = JSON.parse(timetable);
    console.log(timetable);
    return ResultData
        .filter(data => !data.IsBooked)
        .map(({SessionStartTime, SessionCloseTime, IsBooked, BookCode, SessionMemberPrice}) => ({
            SessionStartTime,
            SessionCloseTime,
            IsBooked,
            BookCode,
            SessionMemberPrice
        }));
}

module.exports = { getSlots };

