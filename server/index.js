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

// queue of songs
var queue = [];

var currentSong = null;
var progressInterval = null;
var songInterval = null;

//song = {id, duration, elapsed, size, title, streams, masterStream, downloaded}

nextApp.prepare().then(() => {

    app.get('/test', function (req, res) {

        getStream();

        res.send(true);

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
                let format = ytdl.chooseFormat(info.formats, { quality: '140' }); //mp3, may have to write something to choose available audio if 140 isn't present
                //let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
                //console.log(audioFormats);

                //queue.push({link: link, duration: info.length_seconds, time: 0});
                //console.log(format);
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
                
                let parts = req.headers.range.replace(/bytes=/, "").split("-");
                let partialstart = parts[0];
                let partialend = parts[1] || false;
                let start = parseInt(partialstart, 10);
                let totalSize = currentSong.size;

                console.log('range request: ',start, ' - ',partialend, ' | ',currentSong.size);

                //range requested, only push chunks in range to stream

                let rangeIndex = 0;

                //find range to start data copy
                for (let i = 0, dataSize = 0; i < currentSong.data.length; i++) {

                    dataSize += currentSong.data[i].length;

                    if (dataSize > start) {

                        if (i > 0)
                            rangeIndex = i-1;

                        console.log('found index: ', rangeIndex ,' / ',currentSong.data.length);
                        
                        break;
                    }

                }

                //copy chunks from data to stream
                for (let i = rangeIndex; i < currentSong.data.length; i++) {
                    //console.log('added range: ',i);
                    newStream.passThrough.push(currentSong.data[i]);
                }

                //Temporary fix for wrong content-length
                if(start != 0) {
                  
                    totalSize += start;
                }
                let end = partialend ? parseInt(partialend, 10) : totalSize - 1;
                let chunksize = (end - start) + 1;
      
                if(start <= totalSize) {
            
                    res.writeHead(206, {            
                        'Content-Range': 'bytes ' + start + '-' + end + '/' + totalSize,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': currentSong.type,
                        'Cache-Control': 'no-cache'
                    });

                } else {
                    
                    res.writeHead(416, {});
                }
                let dataread2 = 0;

                newStream.passThrough.pipe(res).on('close', function() {

                    var index = currentSong.streams.indexOf(newStream);

                    currentSong.streams.splice(index, 1);

                    console.log('current streams: ',currentSong.streams.length);
                });


            } else {
                console.log('no range request');
                //no range, push all chunks from beginning to stream
                currentSong.data.forEach(function(chunk) {

                    newStream.passThrough.push(chunk);
    
                });

                res.writeHead(200, {            
                    'Accept-Ranges': 'bytes',
                    'Content-Type': currentSong.type,
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




        /*let link = req.query.link;
        
        if (req.headers.range) {
    
            let parts = req.headers.range.replace(/bytes=/, "").split("-");
            let partialstart = parts[0];
            let partialend = parts[1] || false;
            let start = parseInt(partialstart, 10);
    
            ytdl(link, {filter: (format) => format.itag === '140', range: {start: partialstart} 
    
            }).on('response', function(response) {
    
                let totalSize = parseInt(response.headers['content-length'], 10);
                let type = response.headers['content-type'];
    
                //Temporary fix for wrong content-length
                if(start != 0) {
                  
                  totalSize += start;
                }
                let end = partialend ? parseInt(partialend, 10) : totalSize - 1;
                let chunksize = (end - start) + 1;
    
                if(start <= totalSize) {
              
                    res.writeHead(206, {            
                      'Content-Range': 'bytes ' + start + '-' + end + '/' + totalSize,
                      'Accept-Ranges': 'bytes',
                      'Content-Length': chunksize,
                      'Content-Type': type
                    });
                  } else {
                    
                    res.writeHead(416, {});
                  }
    
            }).pipe(res);
    
        } else {
            ytdl(link, {filter: (format) => format.itag === '140'})
            
            .on('response', function(response) {
    
                let size = response.headers['content-length'];
                let type = response.headers['content-type'];
                res.writeHead(200, {
                    "Accept-Ranges": "bytes", 
                    'Content-Type': type,
                    'Content-Length': size
                });
    
            }).pipe(res);      
        }*/
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

    ytdl(link, {filter: (format) => format.itag === '140'

    }).on('response', function(response) { 
      
        let size = parseInt(response.headers['content-length'], 10);
        let type = response.headers['content-type'];

        //console.log(response.headers);
        let song = {

            id: songIndex,
            videoId: info.video_id,
            duration: info.length_seconds,
            elapsed: 0,
            size: size,
            type: type,
            title: info.title,
            streamIndex: 0,
            streams: [],
            masterStream: masterStream,
            data: [],
            downloaded: false

        }

        queue.push(song);

        if (!currentSong) {
        
            nextSong();

        }

        masterStream.on('finish', function() {

            song.downloaded = true;

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
            
            song.streams.forEach(function(s) {

                s.passThrough.push(data);

            });


        });


        //}    

        
    }).pipe(masterStream);

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

        /*this.stream = ytdl(currentSong.link, {filter: (format) => format.itag === '140'});

        this.passThrough = new stream.PassThrough();
        
        this.stream.pipe(this.passThrough);

        for (let i = 0; i < 10; i++) {
            let passThrough = new stream.PassThrough();
            streams.push({passThrough: passThrough, taken: false});
        }

        this.passThrough.on('data', function(data) {
            
            for (let i = 0; i < 10; i++) {
                streams[i].passThrough.push(data);
            }

        });*/

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
