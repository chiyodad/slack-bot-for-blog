/* to-do
1. 단순한 슬랙봇 제작
2. 로그를 모으는 슬랙봇으로 업데이트
// 참고 사이트
http://proinlab.com/archives/1885
https://youngbin.xyz/blog//2016/05/24/building-nodejs-based-conference-logging-bot-for-slack.html
https://github.com/slackhq/node-slack-sdk/blob/master/README.md
3. 모은 로그를 MD로 만들고
4. 워드프레스닷컴에서 email 로 보내기
*/

//moment js
const moment = require('moment');
const timezone = "" ;
const timeformat =  '';

//Real Time Message 클라이언트 모듈
const RtmClient = require('@slack/client').RtmClient;
const WebClient = require('@slack/client').WebClient;

//클라이언트 이벤트 모듈
const CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

//RTM_EVENTS 모듈
const RTM_EVENTS = require('@slack/client').RTM_EVENTS;

//봇 사용자 토큰
const token = 'xoxb-84506715765-6ceJVsYlERINt3f3RiaqYtNq'; //bot-blog

//새로 RTM 클라이언트 생성(logLevel 은 debug 로)
const rtm = new RtmClient(token, {logLevel: 'debug'});
const web = new WebClient(token, {logLevel: 'debug'});

// 메일로 보내기
const nodemailer = require('nodemailer');
const markdown = require('nodemailer-markdown').markdown;

// create reusable transporter object using the default SMTP transport
const transporter = nodemailer.createTransport('smtps://esstarstudy%40gmail.com:s3401662@smtp.gmail.com');

//posting function
const posting = function(title, md){
  // setup e-mail data with unicode symbols
  transporter.use('compile', markdown());
  let mailOptions = {
      from: 'es2015study <esstarstudy@gmail.com>', // sender address
      to: 'hega782dani@post.wordpress.com', // list of receivers
      subject: title, // Subject line
      //text: text //'Hello world ?', // plaintext body
      markdown: md
      //html: text // html body
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function(error, info){
      if(error){
          return console.log(error);
      }
      console.log('Message sent: ' + info.response);
  });

}

//html 파싱용 모듈
//let cheerio = require('cheerio');

//생성한 RTM 클라이언트 시작.
rtm.start();

//RTM.AUTHENTICATED 이벤트 받기
rtm.on(CLIENT_EVENTS.RTM.AUTHENTICATED, function (rtmStartData) {
  console.log(`Logged in as ${rtmStartData.self.name} of team ${rtmStartData.team.name}, but not yet connected to a channel`);
});

let isRecording = false; //회의 내용 기록 여부(회의 진행중 여부)
let contents =[];
let title = undefined;
let startChanel = undefined;
let startUser = undefined;

rtm.on(RTM_EVENTS.MESSAGE, function (message) {
  console.log("<<<<<<<<<<<<<<<<< 기록 상태 : " + isRecording + ">>>>>>>>>>>>>>>>>>>>.");

  // 기본정보 세팅
  let userId = message.user||message.message.user; //에디트로 메시지 변경시에는 JSON구조가 바뀜
  let text = message.text||message.message.text; //에디트로 메시지 변경시에는 JSON구조가 바뀜
  let teamId = message.team; //에디트로 메시지 변경시에는 JSON구조가 바뀜
  let channelId = message.channel; //에디트로 메시지 변경시에는 JSON구조가 바뀜

  //시작 태그 확인
  if(message.text&&text.includes('&lt;article') > 0) {
    //메시지 내용에 <article 이 포함되어 있고
    if(!isRecording){
      //기록중이 아니면(isRecording 이 false 이면)
      //기록 시작 처리
      if(!text.includes('title')){
        console.log(text);
        rtm.sendMessage('시작 양식 : <article title="제목"> / 제목을 써주세요.', channelId);
        return;
      }

      title = text.substring(text.indexOf('title')+7, text.lastIndexOf('"')).trim() ;

      if(!title.length){
        rtm.sendMessage('시작 양식 : <article title="제목"> / 제목을 써주세요.', channelId);
        return;
      }

      isRecording = true;
      startChanel = channelId;
      startUser = userId;
      contents.push({"type":"subject  ", "username":rtm.dataStore.getUserById(userId).name, "time": moment().utcOffset(timezone).format(timeformat), "text": text});
      rtm.sendMessage("["+ title + "]"+  " 대화 기록을 시작합니다.", channelId);

    }else{
      //이미 회의중 처리
      rtm.sendMessage("진행 중인 대화 ["+ title + "]이(가)"+rtm.dataStore.getChannelById(startChanel).name+"  있습니다.", channelId);
    }
  }else if(text.includes('&lt;/article&gt;')&&isRecording){
    //메시지 내용에 </article> 이 포함 isRecording이 true 이고
    if(startChanel == channelId &&startUser == userId){
      //회의를 시작한 채널과 사용자의 고유번호값이 channel, user에 저장된 것과 같으면
      //회의 종료 처리

      let mdData = "";//마크다운 문법으로 처리한 데이터를 저장 해 둘 변수
      //팀 이름 얻기
      let username = rtm.dataStore.getUserById(userId).name + "("+userId+")";
      let teamname = rtm.dataStore.getTeamById(teamId).name + "("+teamId+")";
      let channelname = rtm.dataStore.getChannelById(channelId).name + "("+channelId+")";

      mdData += "\n## 대화 정보\n";
      mdData += "- Slack 팀 이름 : " + teamname +"\n";
      mdData += "- Slack 채널 이름 : " + channelname +"\n";
      mdData += "- 대화 주제 : " + title +"\n";
      mdData += "- 대화 시작 및 종료한 사용자 : " + username +"\n";
      mdData += "- 대화 시작 시각 : " + contents[0].time +"\n";
      mdData += "- 대화 종료 시각 : " + contents[contents.length - 1].time +"\n";

      // 대화 부분 처리
       mdData += "\n\n## 대화 내용\n";
       for(let i=0; i<contents.length; i++){
           mdData += "- "+contents[i].username+ ": " +contents[i].text + "[" + contents[i].time + "]" + "\n";
       }

       console.log(mdData);

       posting(title, mdData); //posting 하기
       rtm.sendMessage("["+title+"]"+"대화 기록을 종료합니다.", channelId);
       isRecording = false;
       title = undefined;
       startChanel = undefined;
       startUser = undefined;
       contents = [];

      } else{
        // 다른 사람이 대화 종료시
        rtm.sendMessage(`${rtm.dataStore.getUserById(startUser).name} 회원이 ${rtm.dataStore.getChannelById(startChanel).name} 채널에서 </article> 로 대화를 종료해야 합니다.`, channelId);
      }
  } else if(isRecording){
    contents.push({"type":"conversation", "username":rtm.dataStore.getUserById(userId).name, "time": moment().utcOffset(timezone).format(timeformat), "text": text});
  }
});

//팀에서 채널이 새로 생성 되었다는 메시지 받기.
rtm.on(RTM_EVENTS.CHANNEL_CREATED, function (message) {
  //해당 메시지를 받았을떄 수행할 작업을 여기에 작성.
});
