'use strict';

var http = require('http');
var express = require('express');
var app = express();

var fs = require('fs');
function getFilesList(f, dir){
    var files = [];
    fs.readdirSync(dir).forEach(
        file => {
            if(fs.lstatSync(dir+file).isFile()){
                files.push(file);
            }
        }
    );    
    return JSON.stringify(files);
}

app.get('/', function(req, res){
    res.send('{ "files": '+getFilesList(fs, './public/')+ '}');
});

app.get('/:name', function(req, res){
    fs.open('./public/'+req.params.name, 'r', function(err, file){
        if(!err){
            fs.readFile(file, {encoding: 'utf-8'}, function (err, data){
                res.writeHead(200, { 'Content-Type': 'application/' });
                res.write(`${data}`);
                res.end();
            });
        }
        else {
            res.writeHead(400, {'Content-Type': 'application/json'});
            res.write('{"message":"error! File does not exist"}');
            res.end();
        }
    });
});


app.post('/:file', function(req, res){
    console.log(req.body);
});

app.listen(3000, function(){
    console.log('Listening at port 3000');
});