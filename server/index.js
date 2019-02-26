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
const Ffmpeg = require('fluent-ffmpeg');
Ffmpeg.setFfmpegPath(ffmpegInstaller.path);
const Throttle = require('stream-throttle').Throttle;
//var CombinedStream = require('combined-stream');
var youtubeStream = require('youtube-audio-stream')
//TESTING
/*
ytdl.getInfo('https://www.youtube.com/watch?v=6-hRrKFkAQE', (err, info) => {

    addToQueue(info);

});
*/

// queue of songs
var queue = [];
var currentSong = null;

var streams = [];
//var masterStream = CombinedStream.create({pauseStreams: false});
var streamIndex = 0;

var userCount = 0;
var userIndex = 0;

var messages = [];
var messageIndex = 0;

var masterStream = new stream.PassThrough();
/*masterStream.on('data', function(data) {

    streams.forEach(function(s) {

        s.passThrough.push(data);

    });

});*/

/*
var links = ["https://www.youtube.com/watch?v=ABFno49CZIk", 
            "https://www.youtube.com/watch?v=KxW0KjJGU_o",
            "https://www.youtube.com/watch?v=ABFno49CZIk"];


var master = CombinedStream.create({pauseStreams: false});

var livePassThrough = new stream.PassThrough();


//console.log(master);
let rate = 160 * 125;
master.pipe(new Throttle({rate: rate})).pipe(livePassThrough, {end: false});
*/

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

        let rate = 160 * 125;

        /*masterStream.pipe(res).on('close', function() {

            //removeStream(id);
            console.log('closing response');
        });*/

        let pt = new stream.PassThrough();

        masterStream.on('data', function(data) {

            pt.push(data);

        });

        pt.pipe(res).on('close', function() {

            //removeStream(id);
            console.log('closing response');
        });;



    });

    app.get('/add', function (req, res) {

        let link = req.query.link;

        if (link) {

            try {
                ytdl.getInfo(link, (err, info) => {

                    if (info) { 
                        addToQueue(info);
                    } else {
                        console.log('invalid link: ',link);
                    }
                });
            } catch(error) {
                console.error('caught getInfo error: ', error);

            }

            res.send(true);
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

function queueElapsed() {

    let totalElapsedTime = 0;
    
    queue.forEach(function(song) {

        totalElapsedTime += (song.duration - elapsed);

    });

    return totalElapsedTime;

}

var songIndex = 0;

const opt = {
    videoFormat: 'mp4',
    quality: 'lowest',
    audioFormat: 'mp3',
    filter (format) {
      return format.container === opt.videoFormat && format.audioEncoding
    }
  }

function addToQueue(info) {

    let link = 'https://www.youtube.com/watch?v='+info.video_id;

    let song = {

        id: songIndex,
        raw: new stream.PassThrough(),
        mainStream: new stream.PassThrough()

    }

    const audio = ytdl(link, opt).on('response', function(response) { 
      
        let size = parseInt(response.headers['content-length'], 10);
        let type = response.headers['content-type'];
        let seconds = parseInt(info.length_seconds, 10);
        let convertedSize = ((seconds * 160) / 8) * 1000;

        console.log('format: ', type,' - size: ',convertedSize, ' duration: ',info.length_seconds);

        let format = ytdl.chooseFormat(info.formats, {filter: 'audioonly', quality: 'highest'}); 

        song.videoId = info.video_id;
        song.duration = info.length_seconds;
        song.thumb = info.thumbnail_url;
        song.elapsed = 0;
        song.type = type;
        song.title = info.title;
        song.data = [];
        song.downloaded = false;
        song.rawData = [];
        song.bps = 160 * 125; 
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

  
    });

    let bufferStream = new stream.PassThrough();
    let finalSize = 0;

    bufferStream.on('data', function(data) {

        if (!song.skip) {
            song.mainStream.push(data);
            finalSize += data.length;
        } else {
            audio.destroy();
        }
        //console.log('downloading: ', ((finalSize / song.size) * 100).toFixed(2) + '% ');

    });

    bufferStream.on('finish', function() {

        song.downloaded = true;
        console.log('finished downloading song: ',song.id,' final size: ', finalSize);
        song.finalSize = finalSize;

    });


    const ffmpeg = new Ffmpeg(audio);

    let mp3Stream = ffmpeg.format('mp3').withAudioBitrate(160);

    mp3Stream.pipe(bufferStream);

    //masterStream.append(bufferStream);
    
    songIndex++;
}

const secret = 'jradiosecret';

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
        let tempStream = new stream.PassThrough();
        let dataSize = 0;
        let rate = 125 * 160;

        song.mainStream.pipe(new Throttle({rate: rate})).pipe(tempStream).pipe(masterStream);

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

    } else {
        currentSong = null;

    }

}
