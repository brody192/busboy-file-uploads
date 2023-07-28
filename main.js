const express = require("express");
const slugify = require('slugify');
const busboy = require("busboy");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;

const saveDirectory = getSaveDirectory();

console.log("using storage location: " + saveDirectory);

app.use('/files', express.static(saveDirectory, {index: false}));

app.get("/", (_, res) => {
    res.send("Hello World!");
});

app.get("/health", (_, res) => {
    res.sendStatus(200);
});

app.post("/upload", (req, res) => {
    const bb = busboy({ headers: req.headers });

    bb.on("file", (_, file, info) => {
        const saveTo = getSavePath(info.filename);
        file.pipe(fs.createWriteStream(saveTo));
    });

    bb.on("close", () => {
        res.send("saved file(s)");
        res.end();
    });

    req.pipe(bb);
    return;
});

app.get("/list", (_, res) => {
    const saveDirectory = getSaveDirectory();

    fs.readdir(saveDirectory, function (err, files) {
        if (err) {
            console.log('Unable to scan directory: ' + err);
            res.end("Unable to scan directory");
        }

        files.forEach(function (file) {
            if (file.startsWith(".") || file == "lost+found") {
                return;
            }

            res.write(file + "\n")
        });

        res.end();
    });

    return;
});

app.delete("/delete", (req, res) => {
    const file = req.query.file;

    if (!file) {
        res.status(400).send("no file query parameter found");
        return;
    }

    const filepath = path.join(getSaveDirectory(), file);

    try {
        fs.unlinkSync(filepath);
        res.send("File removed");
    } catch (err) {
        console.error("Unable to remove file: " + file + "\n" + err);
        res.status(500).send("Unable to remove file");
    }

    return;
});

app.listen(port, "::", () => {
    console.log(`Example app listening on port ${port}`)
});

function random(n) {
    return crypto.randomBytes(n / 2).toString('hex');
}

function getSavePath(filename) {
    const filenameParsed = path.parse(filename);
    const newFilename = slugify(filenameParsed.name) + "-" + random(6) + filenameParsed.ext;

    return path.join(saveDirectory, newFilename);
}

function getSaveDirectory() {
    const railwayVolumeMountPath = process.env.RAILWAY_VOLUME_MOUNT_PATH;
    return (railwayVolumeMountPath) ? railwayVolumeMountPath : path.join(__dirname, "files");
}