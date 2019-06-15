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
const stream = require('stream');
var jwt = require('jsonwebtoken');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const Throttle = require('stream-throttle').Throttle;
const axios = require('axios');
var request = require('request');
var devnull = require('dev-null');
//const ytdlDiscord = require('ytdl-core-discord');
require('events').EventEmitter.defaultMaxListeners = 100;
const { PerformanceObserver, performance } = require('perf_hooks');

// queue of songs
var queue = [];
var currentSong = null;

var streams = [];
var streamIndex = 0;
var masterStream = new stream.PassThrough();

var bufferData = [];
var bufferSize = 0;

var userCount = 0;
var userIndex = 0;

var messages = [];
var messageIndex = 0;

//soundcloud client_id, may not last forever?
const client_id = 'aBCTLmQDtMoZnq70Drm67BWp3bKWcOgl';

//bit rate of stream output
const bitRate = 128;

//bytes per second for throttle
const bps = bitRate * 125;

//how many seconds of buffer to keep for starting off new streams
const secondsToBuffer = 5;

//size of buffer in bytes to keep stored
const maxBufferSize = secondsToBuffer * bps;

const preferredAudioFormat = 'aac';
let found = false;
//options passed to ytdl for selecting audio format
const opt = {
    //videoFormat: 'mp4',
    //quality: 'lowest',
    //audioFormat: 'mp3',
    filter (format) {
      return format.audioEncoding === preferredAudioFormat && format.audioBitrate === 128;
    }
}

//TESTING
/*
ytdl.getInfo('https://www.youtube.com/watch?v=6-hRrKFkAQE', (err, info) => {
    let format = ytdl.chooseFormat(info.formats, opt);

    console.log(format);
    
    addToQueueYT(info);
    //addToQueueYT(info);
});*/

masterStream.on('data', function(data) {

    if ((bufferSize + data.length) < maxBufferSize) {

        //push chunk to end of buffer
        bufferData.push(data);

        //increment buffer size
        bufferSize += data.length;

    } else {

        //remove front chunk from buffer
        let deletedData = bufferData.splice(0, 1)[0];

        bufferSize -= deletedData.length;

        //push chunk to end of buffer
        bufferData.push(data);

        bufferSize += data.length;

    }

   // console.log('master chunk: ',data.length);

});

function clearBuffer() {

    bufferData = [];
    bufferSize = 0;

}

nextApp.prepare().then(() => {

    app.get('/skip', function (req, res) {

        if (currentSong) {
            currentSong.skip = true;
        }

        res.send(true);

    });

    app.get('/stream', function (req, res) {
    
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive'
        });


        if (currentSong) {

            bufferData.forEach(function (data) {

                res.write(data);

            });

        }

        masterStream.pipe(res).on('close', function() { 

            console.log('closing stream response');
            //masterStream.removeListener('data', func);

        });

    });

    app.get('/add', async function (req, res) {

        let link = req.query.link;

        if (link) {

            try {

                if (link.includes("soundcloud")) {

                    let url = `http://api.soundcloud.com/resolve.json?url=${link}/tracks&client_id=${client_id}`

                    axios.get(url).then(response => {

                        addToQueueSC(response.data);

                    }).catch(error => {
                        
                        console.log('invalid link: ',link, ', error: ',error);

                    });

                } else {

                    ytdl.getInfo(link, (err, info) => {

                        if (info) { 

                            addToQueueYT(info);

                        } else {

                            console.log('invalid link: ',link);
                        }

                    });

                }

                res.send(true);

            } catch(error) {
                console.error('caught getInfo error: ', error);
                res.send(false);

            }

        } else {
    
            res.send(false);
        }
    });

    app.get('*', (req, res) => {
        return handle(req, res);
    });

    io.on('connection', function(socket){

        const userId = userIndex;

        if (currentSong) {
            sendSong(socket);
            sendSongs(socket);
        }

        sendMessages(socket, userId);

        userIndex++;
        userCount++;
        io.emit('users', userCount);

        socket.on('disconnect', function() {

            userCount--;
            io.emit('users', userCount);
        });

        socket.on('message', function(message) {

            let msg = {id: messageIndex, name: 'Guest '+userId, message: message}

            messages.push(msg);

            io.emit('message', msg);

            messageIndex++;
        });
    
    });

    server.listen(PORT, function() {
        console.log('HTTP server listening on port '+PORT);
    });

});

removeStream = id => {

    console.log('removing stream: ', id);
    var index = streams.indexOf(streams.find(s => s.id === id));
    streams.splice(index, 1);

}

function addStream(newStream) {

    console.log('adding stream: ', streamIndex);
    let s = {id: streamIndex, passThrough: newStream};
    streams.push(s);
    streamIndex++;

    return s.id;

}

var songIndex = 0;

  
function addToQueueYT(info) {

    let link = 'https://www.youtube.com/watch?v='+info.video_id;
    let seconds = parseInt(info.length_seconds, 10);
    let convertedSize = ((seconds * 160) / 8) * 1000;

    let song = {

        id: songIndex,
        mainStream: new stream.PassThrough(),
        videoId: info.video_id,
        duration: info.length_seconds,
        thumb: 'https://img.youtube.com/vi/'+info.video_id+'/hqdefault.jpg',//info.thumbnail_url,
        elapsed: 0,
        type: '?',
        title: info.title,
        data: [],
        downloaded: false,
        rawData: [],
        bps: bps, 
        size: convertedSize,
        skip: false,
        destroy: false,
        from: 'yt',
        link: link
    }

    queue.push(song);

    if (!currentSong) {
    
        nextSong();

    }

    let sockets = io.clients().sockets;
    for (let socketId in sockets) {

        let socket = sockets[socketId]; 
        
        //sendSong(socket);
        sendSongs(socket);

    }

    /*const audio = ytdl(link, opt).on('response', function(response) { 
      
        let size = parseInt(response.headers['content-length'], 10);
        let type = response.headers['content-type'];
        let seconds = parseInt(info.length_seconds, 10);
        let convertedSize = ((seconds * 160) / 8) * 1000;

        console.log('format: ', type,' - size: ',convertedSize, ' duration: ',info.length_seconds);

        //let format = ytdl.chooseFormat(info.formats, {filter: 'audioonly', quality: 'highest'}); 

    });*/
    

    songIndex++;
}

function addToQueueSC(data) {

    let streamLink = data.stream_url + "&client_id=" + client_id;

    let song = {

        id: songIndex,
        raw: new stream.PassThrough(),
        mainStream: new stream.PassThrough()

    }

    let audio = new stream.PassThrough();

    request.get(streamLink).on('error', function(error) {

        console.log('error getting sc stream: ', error);

    }).pipe(audio);

    //let size = parseInt(response.headers['content-length'], 10);
    let seconds = Math.round(parseInt(data.duration, 10) / 1000);
    let convertedSize = ((seconds * 160) / 8) * 1000;

    console.log('size: ',data.original_content_size, ' duration: ',seconds);

    song.videoId = data.id;
    song.duration = seconds;
    song.thumb = data.artwork_url;
    song.elapsed = 0;
    song.type = "idk";
    song.title = data.title;
    song.data = [];
    song.downloaded = false;
    song.rawData = [];
    song.bps = bps; 
    song.size = convertedSize;
    song.skip = false;
    song.destroy = false;

    queue.push(song);

    if (!currentSong) {
    
        nextSong();

    }

    let sockets = io.clients().sockets;
    for (let socketId in sockets) {

        let socket = sockets[socketId]; 
        
        //sendSong(socket);
        sendSongs(socket);

    }


    let bufferStream = new stream.PassThrough();
    let finalSize = 0;

    bufferStream.on('data', function(data) {

        if (!song.skip) {
            song.mainStream.push(data);
            finalSize += data.length;
        } else {
            audio.end();
        }
        //console.log('downloading: ', ((finalSize / song.size) * 100).toFixed(2) + '% ');

    });

    bufferStream.on('finish', function() {

        song.downloaded = true;
        console.log('finished downloading song: ',song.id,' final size: ', finalSize);
        song.finalSize = finalSize;

    });


    const ffmpeg = new ffmpeg(audio);

    let mp3Stream = ffmpeg.format('mp3').withAudioBitrate(bitRate);

    mp3Stream.pipe(bufferStream);

    songIndex++;

}

function sendSong(socket) {

    if (currentSong) {
        const { id, videoId, duration, title, started, thumb } = currentSong;

        let song = { id: id, videoId: videoId, duration: duration, title: title, started: started, thumb: thumb };

        socket.emit('song', song);
    }
}

function sendSongs(socket) {

    //if (queue.length > 0) {

        let songs = [];
        queue.forEach((song) => {

            const { id, videoId, duration, title, thumb } = song;
            songs.push({id: id, videoId: videoId, duration: duration, title: title, thumb: thumb });

        });
        socket.emit('songs', songs);
    //}

}

function sendMessages(socket, id) {

    if (messages.length > 0) {

        socket.emit('messages', messages);
    }

    io.emit('message', {message: 'Guest '+id+' has joined the room.'});

}

function nextSong() {

    if (queue.length > 0) {

        let song = queue.shift();


        if (song.from === 'yt') {

            let bufferStream = new stream.PassThrough();
            let finalSize = 0;
            let start = performance.now();

            const audio = ytdl(song.link, opt);

            //audio.pipe(bufferStream).pipe(devnull());

            const encoder = ffmpeg().input(audio);

            //only live audio format that's compatible with all browsers
            encoder.format('mp3').withAudioBitrate(bitRate).pipe(bufferStream).pipe(devnull());

            bufferStream.on('data', function(data) {
                
                if (!song.skip) {

                    //send first 2 seconds of data immediately to users so there's less of a delay between songs

                    if (finalSize <= (bps * 2)) {
                        tempStream.write(data);
                    } else {
                        song.mainStream.push(data);
                    }
                    
                    finalSize += data.length;

                } else {    
                    audio.end();
                    song.mainStream.end();

                    clearBuffer();

                }
                //console.log('downloading: ', ((finalSize / song.size) * 100).toFixed(2) + '% ');
        
            });
        
            bufferStream.on('finish', function() {
        
                song.downloaded = true;
                console.log('finished downloading song: ',song.id,' final size: ', finalSize);
                song.finalSize = finalSize;
                audio.end();
                //tempStream.unpipe(masterStream);
        
            });
            
            let tempStream = new stream.PassThrough();
            let dataSize = 0;
            let throttle = new Throttle({rate: bps});

            song.mainStream.pipe(throttle).pipe(tempStream).pipe(masterStream).pipe(devnull());

            let first = true;

            currentSong = song;

            tempStream.on('data', function(data) {

                if (first) {
                    console.log('ytdl took: ',(performance.now() - start),' ms to start');
                    song.started = Date.now();
                    first = false;

                    let sockets = io.clients().sockets;

                    for (let socketId in sockets) {
        
                        let socket = sockets[socketId]; 
                        
                        sendSong(socket);
                        sendSongs(socket);
        
                    }

                }
                //masterStream.push(data);
                dataSize += data.length;

                //console.log(dataSize);
                if (dataSize >= song.finalSize || song.skip) {

                    throttle.unpipe(tempStream);
                    song.mainStream.end();

                    if (song.skip) {
                        tempStream.unpipe(masterStream);
                        tempStream.end();
                    }

                    console.log('done sending throttled data');
                    //delay to account for buffering

                    clearBuffer();

                    nextSong();
                }

            });

        } else {

            let tempStream = new stream.PassThrough();
            let dataSize = 0;

            song.mainStream.pipe(new Throttle({rate: bps})).pipe(tempStream).pipe(masterStream);

            song.started = Date.now();

            currentSong = song;

            tempStream.on('data', function(data) {

                //masterStream.push(data);
                dataSize += data.length;

                //console.log(dataSize);
                if (dataSize >= song.finalSize || song.skip) {
                    
                    tempStream.unpipe(masterStream);
                    song.mainStream.end();


                    console.log('done sending throttled data');
                    //delay to account for buffering

                    nextSong();
                }

            });

            let sockets = io.clients().sockets;

            for (let socketId in sockets) {

                let socket = sockets[socketId]; 
                
                sendSong(socket);
                sendSongs(socket);

            }
        }

    } else {
        currentSong = null;

    }

}