'use strict';

var http = require('http');
var express = require('express');
var bodyParser = require('body-parser');
var app = express();


app.use(bodyParser.json());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded({
    extended: true
}));

var fs = require('fs');

function getFilesList(f, dir) {
    var files = [];
    fs.readdirSync(dir).forEach(
        file => {
            if (fs.lstatSync(dir + file).isFile()) {
                files.push(file);
            }
        }
    );
    return JSON.stringify(files);
}

//Task 1 Get a list of files available to the public
app.get('/', function (req, res) {
    res.send('{ "files": ' + getFilesList(fs, './public/') + '}');
});

//Task 2 Get a file by name, returns an erro if the file does not exist
app.get('/:name', function (req, res) {
    switch (req.headers['accept']) {
        case 'text/plain':
            console.log("it's a text");
            break;
        case 'text/html':
            console.log('it is HTML');
            break;
        case 'application/json':
            console.log('json package');
            break;
        case 'application/xml':
            console.log('json package');
            break;
        default:
            //console.log('undefined');
            break;
    }

    fs.open('./public/' + req.params.name, 'r', function (err, file) {
        if (!err) {
            fs.readFile(file, { encoding: 'utf-8' }, function (err, data) {
                res.writeHead(200, { 'Content-Type': 'application/' });
                res.write(`${data}`);
                res.end();
            });
        }
        else {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.write('{"message":"error! File does not exist"}');
            res.end();
        }
    });
});

//Upload a file to the server
app.post('/:file', function (req, res) {
    fs.open('./public/' + req.params.file, 'r', function (err, file) {
        if (!err) {
            fs.writeFile('./public/' +req.params.file, req.body, function (err) {
                if (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.write('{"message":"Error writing file"}');
                    res.end();
                }   
                else{
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.write('{"message":"Content overwrited"}');
                    res.end();
                }
            });
        }
        else {
            fs.writeFile('./public/'+req.params.file, req.body, function (err) {
                if (err) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.write('{"message":"Error writing file"}');
                    res.end();
                }   
                else{
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.write('{"message":"New file created"}');
                    res.end();
                }
            });
        }
    });
});

app.listen(3000, function () {
    console.log('Listening at port 3000');
});