const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const path = require('path');
const database = require('mysql');
const https = require('https');
const fs = require('fs');

const app = express();
const port = 443; // HTTPS 포트
const host = '0.0.0.0';

app.use(bodyParser.json());
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname + '/login.html'));
});
app.use(express.static(path.join(__dirname, '/')));

// SSL
const options = {
  key: fs.readFileSync('/web/ssl/private.key'),
  cert: fs.readFileSync('/web/ssl/certificate.crt')
};

// 세션 설정
var cerStatus = 0;

// 서버 실행
https.createServer(options, app).listen(port, host, () => {
  console.log(`Server is running at ${port}`);
});


//세션 설정
var cerStatus = 0;



// DB 연결
var connection = database.createConnection({
  host: '--------',
  port: '--------',
  user: '--------',
  password: '--------',
  database: '--------'
});


// DB 연결 확인
connection.connect(function (err) {
  if (err) {
    console.error('mysql connection error');
    console.error(err);
    throw err;
  } else {
    console.log("DB connected");
  }
});


//메일 설정
const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: true,
  auth: {
    user: '--------',
    pass: '--------',
  },
});


// 메일 옵션 설정
const emailOptions = {
  from: '--------',
  to: '--------',
  subject: 'MetaShield 인증코드',
  html:
    "<h1>MetaShield에서 인증코드를 알려드립니다.</h1> <h2> 인증코드 : </h2>"
    + '<h3 style="color: crimson;">안녕하세요 님. 명지전문대학 학생 인증을 위한 코드를 전송해드립니다.</h3><br>'
    + '<img src="https://cafeptthumb-phinf.pstatic.net/MjAxOTAyMDdfMTMx/MDAxNTQ5NTQzMzc4ODI5.VFzCQxiw8LK5XfRwZXOUMIMe2UPieJmjWBUu6x1YL98g.IxE8IWuKO8GlPN2FTp3ZHYwbZh74koFpY9AaEC9vTcEg.JPEG.ym6688/KakaoTalk_20190205_104401925.jpg?type=f72_72_mask">'
};


// 로그인
app.post('/login', (req, res) => {
  const { email, pw } = req.body;
  console.log(`Received login request - ID: ${email}, PW: ${pw}`);

  var sql = 'SELECT * FROM user WHERE email = ? AND passwd = ?';

  connection.query(sql, [email, pw], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    } else {
      res.send(results);
    }
  });
});


// 인덱스

// 교수자 강의페이지
app.post('/lecture_teacher', (req, res) => {
  const { lec_name, url, start_day, end_day } = req.body;
  var sql = 'INSERT INTO lecture (lec_name, url, start_day, end_day) VALUES (?, ?, ?, ?)';
  connection.query(sql, [lec_name, url, start_day, end_day], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('내부서버 오류');
    } else {
      res.send('강의 등록 완료');
    }
  });
});


//학생 강의페이지
app.post('/lecture_student', (req, res) => {
  var sql = 'SELECT * FROM lecture WHERE start_day >= CURDATE() AND CURDATE() <= end_day;';
  connection.query(sql, (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('내부서버 오류');
    } else {
      // console.log(results);
      res.send(results);
    }
  });
});



//회원가입
app.post('/register', (req, res) => {
  if (cerStatus == 0) {
    res.send("이메일 인증을 완료해주세요.");
    return;
  }
  const { name, email, studentId, password, role } = req.body;
  var sql = 'INSERT INTO user (name, student_id, email, passwd, role) VALUES (?, ?, ?, ?, ?)';
  connection.query(sql, [name, studentId, email, password, role], (error, results) => {
    if (error) {
      console.error(error);
      res.status(500).send('내부서버 오류');
    } else {
      res.send('회원가입이 완료되었습니다.');
      cerStatus = 0;
    }
  });
});


// 메일 인증
var authNum = '';
app.post('/mail', (req, res) => {
  authNum = Math.random().toString().substr(2, 6);
  console.log(authNum);
  const { name, email } = req.body;
  console.log(`Received mail request - Name: ${name}, Mail: ${email}`);

  // 메일 옵션 업데이트
  emailOptions.to = email;
  emailOptions.html = "<h1>MetaShield에서 인증코드를 알려드립니다.</h1> <h2> 인증코드 : " + authNum + "</h2>"
    + '<h3 style="color: crimson;">안녕하세요 ' + name + '님. 명지전문대학 학생 인증을 위한 코드를 전송해드립니다.</h3><br>';

  transporter.sendMail(emailOptions, (error, info) => {
    if (error) {
      console.error(error);
      res.status(500).send('Mail sending failed');
    } else {
      //현제시간 출력
      var now = new Date();
      var month = now.getMonth() + 1;
      var date = now.getDate();
      var hours = now.getHours();
      var minutes = now.getMinutes();
      console.log('[' + month + '/' + date + ' ' + hours + ':' + minutes + ']  메일 전송 완료');
      res.send('Mail successful!');
    }
  });
});


//인증번호 확인
app.post('/verify', (req, res) => {
  if (req.body.authCode == authNum) {
    cerStatus = 1;
    res.send('인증되었습니다.');
  }
  else {
    cerStatus = 0;
    res.send('인증번호가 일치하지 않습니다.');
  }
  console.log(req.body.authCode);
});