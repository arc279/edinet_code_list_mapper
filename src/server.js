const express = require('express');
const app = express();
const port = 3000;
app.use(express.static('static'));

// const EXPIRE_LIMIT = 10 * 1000; // usec
const EXPIRE_LIMIT = 24 * 60 * 60 * 1000;

const axios = require('axios');
const https = require('https');

const fs = require("fs")
const path = require('path');
const ZIP_FILE = path.resolve(__dirname, "../static/Edinetcode.zip")

function fetchEdinetCodeList() {
  const url = `https://disclosure.edinet-fsa.go.jp/E01EW/download?uji.verb=W1E62071EdinetCodeDownload&uji.bean=ee.bean.W1E62071.EEW1E62071Bean&TID=W1E62071&PID=W1E62071&SESSIONKEY=1527576724074&downloadFileName=&lgKbn=2&dflg=0&iflg=0&dispKbn=1`;
  console.log(url)

  const agent = new https.Agent({
    rejectUnauthorized: false
  });
  return axios.get(url, { httpsAgent: agent, responseType: 'arraybuffer' });
}

function checkUpdate() {
  if(!fs.existsSync(ZIP_FILE)) {
    return true;
  }

  const st = fs.statSync(ZIP_FILE)
  const df = new Date() - st.mtime;
  console.log(st.mtime, df, EXPIRE_LIMIT)
  if(df > EXPIRE_LIMIT) {
    return true;
  }

  return false;
}

app.get('/touch', (req, res) => {
  if(checkUpdate()) {
    fetchEdinetCodeList()
      .then((resp) => {
        console.log(resp.data.length)
        fs.writeFileSync(ZIP_FILE, resp.data, "binary", function(err) {
          console.error(err)
        })
        const st = fs.statSync(ZIP_FILE)
        res.send({"expiredAt": new Date(st.mtime + EXPIRE_LIMIT)});
      })
      .catch((err) => {
        console.error(err)
        res.send(500);
      })
  } else {
    const st = fs.statSync(ZIP_FILE)
    res.send({"expiredAt": new Date(st.mtime + EXPIRE_LIMIT)});
  }
})

app.listen(port, () => {
  console.log('listen: ' + port);
});
