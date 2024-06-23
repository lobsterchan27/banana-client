const express = require('express');
const path = require('path');
const cors = require('cors');
const { checkYtDlp } = require('./src/utils')
const {
    HOSTNAME,
    PORT
} = require('settings');

const app = express();
const port = PORT;
const hostname = HOSTNAME;

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

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(port, hostname, () => {
    console.log(`Server on http://${hostname}:${port}`);
});