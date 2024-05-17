require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { checkYtDlp } = require('./src/utils')
const app = express();
const port = Number(process.env.PORT) || 8128;
const hostname = process.env.HOSTNAME || '0.0.0.0';

checkYtDlp();

var corsOptions = {
    origin: '*',
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/kobold', require('./src/kobold').router);

app.use('/banana', require('./src/banana').router);

app.use('/chat', require('./src/chat').router);

app.use('/audio', require('./src/audio').router);

app.use('/files', require('./src/files').router);

app.use('/video', require('./src/video').router);

app.use('/youtube', require('./src/youtube').router);

app.listen(port, hostname, () => {
    console.log(`Server on http://${hostname}:${port}`);
});