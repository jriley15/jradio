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
var messageIndex = 0;


/*masterStream.on('data', function(data) {

    streams.forEach(function(s) {

        s.passThrough.push(data);

    });

});*/


nextApp.prepare().then(() => {

    app.get('/stream', function (req, res) {
    
        res.writeHead(200, {
            'Content-Type': 'audio/mpeg',
            'Transfer-Encoding': 'chunked',
            'Connection': 'keep-alive'
        });


        masterStream.pipe(new Throttle({rate: song.bps})).pipe(res).on('close', function() {

            //removeStream(id);
            console.log('closing response');
        });

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

function addToQueue(info) {

    let link = 'https://www.youtube.com/watch?v='+info.video_id;

    let song = {

        id: songIndex,
        raw: new stream.PassThrough(),
        mainStream: new stream.PassThrough()

    }

    let audioStream = new stream.PassThrough();
    //console.log(info);

    const audio = ytdl(link, {filter: 'audioonly', quality: 'highest'}).on('response', function(response) { 
      
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

  
    }).pipe(audioStream);

    let bufferStream = new stream.PassThrough();
    let finalSize = 0;

    bufferStream.on('data', function(data) {

        song.mainStream.push(data);
        finalSize += data.length;

    });

    bufferStream.on('finish', function() {

        song.downloaded = true;
        console.log('finished downloading song: ',song.id,' final size: ', finalSize);
        song.finalSize = finalSize;

    });


    const ffmpeg = new Ffmpeg(audioStream);

    ffmpeg.format('mp3').withAudioBitrate(160).pipe(bufferStream);



    
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

        song.mainStream.pipe(masterStream);
        console.log(4);
        song.started = Date.now();

        currentSong = song;
        console.log(5);
        tempStream.on('data', function(data) {

            //masterStream.push(data);
            dataSize += data.length;

            //console.log(dataSize);
            if (dataSize >= song.finalSize) {
                
                //tempStream.unpipe(masterStream);
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
