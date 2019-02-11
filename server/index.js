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


var currentSong = null;
var queue = [];
var progressInterval = null;
var songInterval = null;
var streams = [];


function nextSong() {

    if (queue.length > 0) {

        let song = queue.shift();

        currentSong = song;

        this.stream = ytdl(currentSong.link, {filter: (format) => format.itag === '140'});

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
    

        });

        



        progressInterval = setInterval(() => {

            currentSong.time++;

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

nextApp.prepare().then(() => {

    io.on('connection', function(socket){

        if (currentSong) {
            socket.emit('song', currentSong);
        }
    
    });

    app.get('/add', function (req, res) {

        let link = req.query.link;

    
        if (link) {
            ytdl.getInfo(link, (err, info) => {
            if (err) throw err;
            let format = ytdl.chooseFormat(info.formats, { quality: '140' });
            //let audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

            //console.log(audioFormats);

            queue.push({link: link, duration: info.length_seconds, time: 0});
    
            if (!currentSong) {
    
                nextSong();
    
            }
            
          });

            res.send(true);
        } else {
    
            res.send(false);
        }
        //ytdl(link, {filter: (format) => format.itag === '140'}).pipe(fs.createWriteStream('./files/idk.mp4'));



    });

    //from google
    //https://r15---sn-bvvbax-2iml.googlevideo.com/videoplayback?ipbits=0&fvip=5&mime=video%2Fwebm&clen=39231326&txp=5432432&requiressl=yes&ms=au%2Conr&mt=1549850398&key=yt6&mv=m&dur=298.565&gir=yes&itag=247&expire=1549872080&mn=sn-bvvbax-2iml%2Csn-n4v7knlz&id=o-AIKlTTHvU2Y1qCNdm_tTN1YLXq-LI61p0R-OSL0dzKZN&aitags=133%2C134%2C135%2C136%2C137%2C160%2C242%2C243%2C244%2C247%2C248%2C278&ei=cNdgXLKvIMeIkwbhrIugBA&ip=98.171.80.97&lmt=1540014791561125&source=youtube&sparams=aitags%2Cclen%2Cdur%2Cei%2Cgir%2Cid%2Cinitcwndbps%2Cip%2Cipbits%2Citag%2Ckeepalive%2Clmt%2Cmime%2Cmm%2Cmn%2Cms%2Cmv%2Cnh%2Cpl%2Crequiressl%2Csource%2Cexpire&initcwndbps=1870000&beids=9466586&pl=17&mm=31%2C26&nh=EAE%2C&c=WEB&keepalive=yes&alr=yes&signature=DBBF9976DDC38F0AAC834D99A817AE217AB2E640.24E742A250C3AAD1046011AE41C61182C5EC6113&cpn=AuAU9_-_FZsUPpKF&cver=2.20190207&range=0-277585&altitags=244%2C243&rn=1&rbuf=0
    
    //from ytdl
    //https://r14---sn-bvvbax-2ime.googlevideo.com/videoplayback?itag=18&mime=video%2Fmp4&dur=292.501&ms=au%2Conr&ei=SNRgXIqOB9WakwbMlqKICw&id=o-AAtZMdI6oJdCpYLuMW_PzL7szFQvzTw8Pht1pYClUNBC&pl=17&mv=m&mt=1549849585&fvip=4&ratebypass=yes&gir=yes&expire=1549871272&mn=sn-bvvbax-2ime%2Csn-n4v7knlz&mm=31%2C26&source=youtube&sparams=clen%2Cdur%2Cei%2Cgir%2Cid%2Cinitcwndbps%2Cip%2Cipbits%2Citag%2Clmt%2Cmime%2Cmm%2Cmn%2Cms%2Cmv%2Cnh%2Cpl%2Cratebypass%2Crequiressl%2Csource%2Cexpire&requiressl=yes&clen=7557938&ip=98.171.80.97&lmt=1461995620961172&initcwndbps=1847500&key=yt6&c=WEB&ipbits=0&nh=EAE%2C&signature=8C5B407C8DD1E7E8C47CCC11FC37F888B4FC39AC.DF87E02A387F13A96E039471082A607F87B37DB6
    
    
    //https://r10---sn-bvvbax-2iml.googlevideo.com/videoplayback?dur=289.041&lmt=1545409916530660&clen=4678811&gir=yes&nh=EAI%2C&sparams=clen%2Cdur%2Cei%2Cgir%2Cid%2Cinitcwndbps%2Cip%2Cipbits%2Citag%2Ckeepalive%2Clmt%2Cmime%2Cmm%2Cmn%2Cms%2Cmv%2Cnh%2Cpl%2Crequiressl%2Csource%2Cexpire&requiressl=yes&fvip=5&source=youtube&id=o-AGgn-XqN7Yl0FexIqgqdUNnVEvmuHVQMPEahVkimFlFM&pl=17&keepalive=yes&txp=5533432&ms=au%2Conr&mv=m&mt=1549856437&itag=140&mm=31%2C26&ipbits=0&initcwndbps=1873750&key=yt6&mime=audio%2Fmp4&ei=Fe9gXLb6K9D7kga-9pa4CA&c=WEB&expire=1549878133&mn=sn-bvvbax-2iml%2Csn-n4v7knlz&ratebypass=yes&signature=9221C57CEA71CAD834541062D40A44E957CED144.E22A90E51496466624A09E04E2945A05FBECFDFB




    app.get('/stream', async function (req, res) {
    

        //this.stream.pipe(res);
        if (streams.length  > 0) {
            for (let i = 0; i < 10; i++) {

                if (!streams[i].taken) {
                    streams[i].taken = true;
                    streams[i].passThrough.pipe(res);
                    break;

                }

            }
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

