const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 5000;

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

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});