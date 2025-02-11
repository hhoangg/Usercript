const path = require('path');
const fs = require('fs');

const express = require('express');

const distDir = path.join(__dirname, '/dist');

const app = new express();
app.use(express.static(distDir));

app.listen(4444, async () => {
    const files = fs.readdirSync(distDir);

    console.log(`http://localhost:4444/${files[0]}`)
})
