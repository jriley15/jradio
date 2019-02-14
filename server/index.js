const next = require('next');
const express = require('express');
const ytdl = require('ytdl-core');
const http = require('http');
const app = express();
const dev = process.env.NODE_ENV !== 'production';
const nextApp = next({ dev });
const PORT = process.env.PORT || 3000;
const handle = nextApp.getRequestHandler();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require('fs');
const stream = require('stream');
var jwt = require('jsonwebtoken');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const Ffmpeg = require('fluent-ffmpeg')

Ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// queue of songs
var queue = [];

var currentSong = null;
var progressInterval = null;
var songInterval = null;

//song = {id, duration, elapsed, size, title, streams, masterStream, downloaded}


nextApp.prepare().then(() => {

    app.get('/test', async function (req, res) {


        //mixer.pipe(res);
        ytdl('https://www.youtube.com/watch?v=KvRVky0r7YM',  {filter: (format) => format.itag === '140'
    
        }).on('response', function(response) { 
      
            let size = parseInt(response.headers['content-length'], 10);

            res.writeHead(200, {            
                'Content-Type': 'audio/mp4',
                'Content-Length': size,
            });
            
        }).pipe(res);


    });

    io.on('connection', function(socket){

        if (currentSong) {
            sendSong(socket);
        }
    
    });

    app.get('/add', function (req, res) {

        let link = req.query.link;

    
        if (link) {

            ytdl.getInfo(link, (err, info) => {

                if (err) throw err;
                let format = ytdl.chooseFormat(info.formats, {filter: 'audioonly', quality: 'highest'}); 
                
                //console.log(format);

                //mp3, may have to write something to choose available audio if 140 isn't present
                //let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                //console.log(audioFormats);

                //queue.push({link: link, duration: info.length_seconds, time: 0});
                //console.log(format);
                //let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                //console.log(audioFormats);

                addToQueue(info);
                //res.send(info);
        
            
            });

            res.send(true);
        } else {
    
            res.send(false);
        }
        //ytdl(link, {filter: (format) => format.itag === '140'}).pipe(fs.createWriteStream('./files/idk.mp4'));



    });



    app.get('/stream', function (req, res) {
    


        if (currentSong) {


            let passThrough = new stream.PassThrough();
            let newStream = {id: currentSong.streamIndex, passThrough: passThrough};
            

            currentSong.streams.push(newStream);

            currentSong.streamIndex++;

            console.log('current streams: ',currentSong.streams.length);


            if (req.headers.range) {
                
                var range = req.headers.range;
                var positions = range.replace(/bytes=/, '').split('-');
                var start = parseInt(positions[0], 10);
                let total = parseInt(currentSong.size, 10); 

                var end = positions[1] ? parseInt(positions[1], 10) : total - 1;
                var chunkSize = (end - start) + 1;

                console.log('range request: ',start, ' - ',end, ' | ',currentSong.size);


                let buffer = Buffer.concat(currentSong.data);

                if (start <= buffer.length) {

                    buffer = buffer.slice(start, end);
                } 

                console.log('pushing ',buffer.length,' bytes onto pass through');

                let splitSize = 16335;

                while (buffer.length > 0) {

                    if (buffer.length < splitSize) {
                        splitSize = buffer.length;
                    }

                    let chunk = buffer.slice(0, splitSize);
                    newStream.passThrough.push(chunk);
                    buffer = buffer.slice(splitSize);

                }

                res.writeHead(206, {            
                    'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunkSize,
                    'Content-Type': 'audio/mpeg'
                });

                newStream.passThrough.pipe(res).on('close', function() {

                    if (currentSong) {
                        var index = currentSong.streams.indexOf(newStream);

                        currentSong.streams.splice(index, 1);

                        console.log('current streams: ',currentSong.streams.length);
                    }
                });


            } else {
                console.log('no range request');
                //no range, push all chunks from beginning to stream
                currentSong.data.forEach(function(chunk) {

                    newStream.passThrough.push(chunk);
    
                });

                res.writeHead(200, {            
                    'Accept-Ranges': 'bytes',
                    'Content-Type': 'audio/mpeg',//currentSong.type,
                    'Content-Length': currentSong.size,
                    'Cache-Control': 'no-cache'
                });


                newStream.passThrough.pipe(res).on('close', function() {

                    var index = currentSong.streams.indexOf(newStream);

                    currentSong.streams.splice(index, 1);

                    console.log('current streams: ',currentSong.streams.length);
                });
            }


        } else {
            res.send(false);
        }

    });

    app.get('*', (req, res) => {
        return handle(req, res);
    });
    
    
    server.listen(PORT, function() {
        console.log('HTTP server listening on port '+PORT);
    });
    
    


});


function queueElapsed() {

    let totalElapsedTime = 0;
    
    queue.forEach(function(song) {

        totalElapsedTime += (song.duration - elapsed);

    });

    return totalElapsedTime;

}

var songIndex = 0;
function addToQueue(info) {

    //id, duration, elapsed, size, title, streams, masterStream, downloaded}

    let masterStream = new stream.PassThrough();
    

    let link = 'https://www.youtube.com/watch?v='+info.video_id;

    const audio = ytdl(link, {filter: 'audioonly', quality: 'highest'}).on('response', function(response) { 
      
        let size = parseInt(response.headers['content-length'], 10);
        let type = response.headers['content-type'];

        console.log('format: ', type,' - size: ',size, ' duration: ',info.length_seconds);

        let seconds = parseInt(info.length_seconds, 10);
        let convertedSize = ((seconds * 160) / 8) * 1000;
        
        console.log('calculated size: ', convertedSize);


        let song = {

            id: songIndex,
            videoId: info.video_id,
            duration: info.length_seconds,
            elapsed: 0,
            size: convertedSize,
            type: type,
            title: info.title,
            streamIndex: 0,
            streams: [],
            masterStream: masterStream,
            data: [],
            downloaded: false,
            rawData: []

        }

        queue.push(song);

        if (!currentSong) {
        
            nextSong();

        }

        masterStream.on('finish', function() {

            song.downloaded = true;
            console.log('total size: ',dataRead);

        });

        //if total song time ahead in the queue isn't going to last long enough to dl this song to fs at 1.5 song play speed
        //if (queueElapsed() < (song.duration / 1.5)) {

            //start piping master stream to children pass throughs
        var dataRead = 0;
        masterStream.on('data', function(data) {
            dataRead += data.length;
            
            console.log('downloaded: ', ((dataRead / song.size) * 100).toFixed(2) + '% ');
            //console.log('recieved');
            //console.log('master stream receiving data');


            song.data.push(data);
            
            //console.log('data: ', data[0]);
            
            song.streams.forEach(function(s) {

                s.passThrough.push(data);
                //console.log('pushing data to stream: ',dataRead);

            });


        });
        //}    

        
    });

    const ffmpeg = new Ffmpeg(audio);

    ffmpeg.format('mp3').withAudioBitrate(160).pipe(masterStream);


    //masterStream.pipe(fs.createWriteStream('./files/'+songIndex));

    //start streams?


    songIndex++;
}

const secret = 'jradiosecret';

function sendSong(socket) {

    var address = socket.handshake.address;
    let token = jwt.sign({id: currentSong.id, ip: address.address, time: currentSong.elapsed}, secret);

    socket.emit('song', token);
}

function nextSong() {

    if (queue.length > 0) {

        let song = queue.shift();

        currentSong = song;

        let sockets = io.clients().sockets;

        for (let socketId in sockets) {

            let socket = sockets[socketId]; 
            var address = socket.handshake.address;
            let token = jwt.sign({id: currentSong.id, ip: address.address, time: currentSong.elapsed}, secret);
            socket.emit('song', token);

        }

        progressInterval = setInterval(() => {

            currentSong.elapsed++;

        }, 1000);

        songInterval = setInterval(() => {
            
            clearInterval(progressInterval);
            clearInterval(songInterval);
            nextSong();

        }, currentSong.duration * 1000);

    } else {

        currentSong = null;

    }

}
