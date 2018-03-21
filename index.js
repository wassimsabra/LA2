'use strict';

var net = require('net');
var fs = require('fs');
var path = require('path');
var server = net.createServer();
var lock = {};

server.listen(9999, '127.0.0.1');//Listen on IP, PORT

server.on('connection', handle);//Handle on connection event

function getFilesList(dir){
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

function handle(socket) {

    //Received Data from the socket
    socket.on('data', (data) => {
        var request = data.toString().trim();
        console.log(request);
        //Process the request
        parseRequest(request, function (options) {
            if(lock[options.path] !== "none" && lock[options.path] !== undefined){
                var temp = `<h1>Somebody is ${lock[options.path]} to the file requested. Please try again later</h1>`;
                socket.write(`${options['http']} 423 OK\r\n`);
                socket.write('Content-Type: text/html\r\n');
                socket.write(`Content-Length: ${temp.length}\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                socket.write(temp);
                socket.end();
            }
            else if (options['path'].match(/\//g).length > 1) {//Trying to access a directory not allowed /public/
                socket.write(`${options['http']} 404 OK\r\n`);
                socket.write('Content-Type: text/html\r\n');
                socket.write(`Content-Length: 19\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                socket.write('<h1>Wrong URL!</h1>');
                socket.end();
            }
            else if (options['method'] === 'post') {
                if (options.path === '/' || options.path === '') {
                    socket.write(`${options['http']} 400 OK\r\n`);
                    socket.write('Content-Type: text/html\r\n');
                    socket.write(`Content-Length: 54\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                    socket.write('<h1>Bad request, You have to specify a file name!</h1>');
                    socket.end();
                }
                else {
                    var body = '';
                    if (options['content-length'] !== undefined) {//Parse content length
                        if (request.split('\r\n\r\n')[1] !== undefined) {
                            body = request.split('\r\n\r\n')[1].substring(0, parseInt(options['content-length']));
                        }
                        fs.open('./public' + options.path, 'r', function (err, file) {
                            if (!err) {
                                lock[options.path] = "Writing";
                                fs.writeFile('./public/' + options.path, body, function (err) {
                                    if (err) {
                                        socket.write(`${options['http']} 500 OK\r\n`);
                                        socket.write('Content-Type: text/html\r\n');
                                        socket.write(`Content-Length: 27\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                                        socket.write('<h1>Error writing file</h1>');
                                        socket.end();
                                    }
                                    else {
                                        socket.write(`${options['http']} 200 OK\r\n`);
                                        socket.write('Content-Type: text/html\r\n');
                                        socket.write(`Content-Length: 27\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                                        socket.write('<h1>Content overwrited</h1>');
                                        socket.end();
                                    }
                                });
                                lock[options.path] = "none";
                            }
                            else {
                                fs.writeFile('./public' + options.path, body, function (err) {
                                    lock[options.path] = "Writing";
                                    if (err) {
                                        socket.write(`${options['http']} 500 OK\r\n`);
                                        socket.write('Content-Type: text/html\r\n');
                                        socket.write(`Content-Length: 27\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                                        socket.write('<h1>Error writing file</h1>');
                                        socket.end();
                                    }
                                    else {
                                        socket.write(`${options['http']} 201 OK\r\n`);
                                        socket.write('Content-Type: text/html\r\n');
                                        socket.write(`Content-Length: 25\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                                        socket.write('<h1>New File Created</h1>');
                                        socket.end();
                                    }
                                    
                                    lock[options.path] = "none";
                                });
                            }
                        });
                    }
                    else {
                        socket.write(`${options['http']} 411 OK\r\n`);
                        socket.write('Content-Type: text/html\r\n');
                        socket.write(`Content-Length: 37\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                        socket.write('<h1>Bad request. Unknown Content</h1>');
                        socket.end();
                    }
                }
            }
            else if (options['method'] === 'get') {
                if (options.path === '/' || options.path === '') {//Get / return the list of available files
                    var filesList = '';
                    filesList = getFilesList('./public/');
                    socket.write(`${options['http']} 200 OK\r\n`);
                    socket.write('Content-Type: text/html\r\n');
                    socket.write(`Content-Length: ${filesList.length}\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                    socket.write(filesList);
                    socket.end();
                }
                else {
                    //Try to open file for reading
                    fs.open('./public' + options.path, 'r', function (err, file) {
                        if (!err) {//Return the content of the file if exists
                            lock[options.path] = "Reading";
                            fs.readFile(file, { encoding: 'utf-8' }, function (err, data) {
                                socket.write(`${options['http']} 200 OK\r\n`);
                                socket.write(`Content-Type: ${options['accept']}\r\n`);
                                //Content disposition header
                                socket.write(`Content-Disposition: attachment; filename=${path.basename(options.path)}\r\n`);
                                socket.write(`Content-Length: ${data.length}\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                                socket.write(`${data}`);
                                socket.end();
                                lock[options.path] = "none";
                            });
                        }
                        else {//File not found
                            socket.write(`${options['http']} 404 OK\r\n`);
                            socket.write('Content-Type: text/html\r\n');
                            socket.write(`Content-Length: 24\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                            socket.write('<h1>File Not Found!</h1>');
                            socket.end();
                        }
                    });
                }
            }
            else {//Other methods not allowed
                socket.write(`${options['http']} 405 OK\r\n`);
                socket.write('Content-Type: text/html\r\n');
                socket.write(`Content-Length: 27\r\n\r\n`);//Two CR LF End of headers, the following is the body 
                socket.write('<h1>Method Not Allowed</h1>');
                socket.end();
            }
        });
    });

    //Parse request method, path, http version, headers
    function parseRequest(req, callback) {
        var arr = req.split("\r\n");
        var firstLine = arr[0].split(' ');
        var options = {};
        options['method'] = firstLine[0].toLowerCase();
        options['path'] = firstLine[1].toLowerCase();
        options['http'] = firstLine[2];

        var temp;
        for (var i = 1; i < arr.length; i++) {
            temp = arr[i].trim().split(':');
            if (temp.length > 1) {
                options[`${temp[0].trim().toLowerCase()}`] = temp[1].trim().toLowerCase();
            }
        }
        callback(options);
    }

    socket.on('end', () => {
    });

    socket.on('close', () => {
    });

    socket.on('error', () => {
        socket.write(`${options['http']} 405 OK\r\n`);
        socket.write('Content-Type: text/html\r\n');
        socket.write(`Content-Length: 15\r\n\r\n`);//Two CR LF End of headers, the following is the body 
        socket.write('<h1>Error!</h1>');
        socket.end();
    });
}