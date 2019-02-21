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
var masterStream = new stream.PassThrough();
var streamIndex = 0;

var userCount = 0;
var userIndex = 0;

var messages = [];

masterStream.on('data', function(data) {

    streams.forEach(function(s) {

        s.passThrough.push(data);

    });

});

nextApp.prepare().then(() => {

    app.get('/stream', function (req, res) {
    
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive'
        });
        if (currentSong) {

            let liveStream = new stream.PassThrough();
            let id = addStream(liveStream);

            liveStream.pipe(res).on('close', function() {

                removeStream(id);

            });

        }

    });

    app.get('/add', function (req, res) {

        let link = req.query.link;

        if (link) {

            ytdl.getInfo(link, (err, info) => {

                addToQueue(info);

            });

            res.send(true);
        } else {
    
            res.send(false);
        }
    });


    app.get('*', (req, res) => {
        return handle(req, res);
    });

    io.on('connection', function(socket){

        if (currentSong) {
            sendSong(socket);
            sendSongs(socket);
        }

        const userId = userIndex;

        userIndex++;
        userCount++;
        io.emit('users', userCount);

        socket.on('disconnect', function() {

            userCount--;
            io.emit('users', userCount);
        });

        socket.on('message', function(message) {

            

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

function addToQueue(info) {

    let link = 'https://www.youtube.com/watch?v='+info.video_id;

    let song = {

        id: songIndex,
        raw: new stream.PassThrough(),
        mainStream: new stream.PassThrough()

    }

    //console.log(info);

    const audio = ytdl(link, {filter: 'audioonly', quality: 'highest'}).on('response', function(response) { 
      
        let size = parseInt(response.headers['content-length'], 10);
        let type = response.headers['content-type'];

        console.log('format: ', type,' - size: ',size, ' duration: ',info.length_seconds);

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
        song.bps = (parseInt(format.audioBitrate, 10) * 125); 

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

        song.mainStream.on('finish', function() {

            song.downloaded = true;
            console.log('finished downloading song: ',song.id);

        });

  
    });

    const ffmpeg = new Ffmpeg(audio);

    ffmpeg.format('mp3').withAudioBitrate(160).pipe(song.mainStream);

    
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

    if (queue.length > 0) {

        let songs = [];
        queue.forEach((song) => {

            const { id, videoId, duration, title, thumb } = song;
            songs.push({id: id, videoId: videoId, duration: duration, title: title, thumb: thumb });

        });
        socket.emit('songs', songs);
    }

}

function nextSong() {

    if (queue.length > 0) {

        let song = queue.shift();

        currentSong = song;

        console.log('playing next song');
        let tempStream = new stream.PassThrough();

        currentSong.mainStream.pipe(new Throttle({rate: currentSong.bps})).pipe(tempStream);

        tempStream.on('data', function(data) {

            masterStream.push(data);

        });
        
        tempStream.on('finish', function() {

            console.log('done sending throttled data');

            nextSong();
           

        });

        currentSong.started = Date.now();
        
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
