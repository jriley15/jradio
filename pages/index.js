import React, { Component } from 'react';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import IconButton from '@material-ui/core/IconButton';
import PlayArrow from '@material-ui/icons/PlayArrow';
import Pause from '@material-ui/icons/Pause';
import Volume from '@material-ui/icons/VolumeUp';
import Slider from '@material-ui/lab/Slider';
import LinearProgress from '@material-ui/core/LinearProgress';
import Slide from '@material-ui/core/Slide';
import Button from '@material-ui/core/Button';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import NavBar from './components/NavBar';
import CircularProgress from '@material-ui/core/CircularProgress';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableHead from '@material-ui/core/TableHead';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import Dot from '@material-ui/icons/FiberManualRecord';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import Chat from './components/Chat';

const styles = theme => ({
    root: {
      textAlign: 'center',
      paddingTop: theme.spacing.unit * 20,
    },

    container: {
        padding: theme.spacing.unit,
        paddingBottom: theme.spacing.unit * 8
    },

    appBar: {
        top: 'auto',
        bottom: 0,
    },
    toolbar: {
      alignItems: 'center',
      justifyContent: 'space-between',
    },

    volume: {
        width: 100,

    },
    slider: {
        padding: '22px 0px',
    },
    tableRoot: {
        marginTop: theme.spacing.unit,
        overflowX: 'auto',
    },

    liveDot: {
        color: 'red', 
        fontSize: '0.5rem',
        marginRight: theme.spacing.unit / 2
    },

    live: {
        marginRight: theme.spacing.unit
    },
    volumePad: {
        padding: (theme.spacing.unit * 4.375) /2
    }


  });


class index extends Component {

    constructor(props) {
        super(props);
        
        this.state = {

            currentSong: null,
            token: null,

            playing: false,
            progress: 0,
            volume: 100,
            volumeToggle: false,
            debug: [],

            interacted: false,
            waiting: false,

            songs: [],
            users: 0,

            value: 0,

            messages: [],

            fixedTabs: false

        }

        this.totalOffset = 0;

        this.debugMode = false;

        this.socket = io();
    }

    componentDidMount() {

        //this.socket = io();
        
        this.socket.on('song', (data) => {

            this.totalOffset = this.player.currentTime;
            
            console.log(this.totalOffset);
            console.log(this.player.currentTime);
            console.log(data.started);

            console.log('new song: ',data);

            let song = data;
            song.timeOffset = 0;
            song.firstPlay = true;
            
            if (this.state.interacted && (this.state.waiting || !this.state.playing)) {

                console.log('loading / playing');
                this.player.load();
                this.player.play();

            } else {

                song.timeOffset = (Date.now() - new Date(song.started)) / 1000;

            }

            this.setState({currentSong: song});

        });

        this.socket.on('messages', (messages) => {

            this.setState({messages: messages});

        });

        this.socket.on('message', (message) => {

            this.setState({messages: [...this.state.messages, message]});

        });

        this.socket.on('songs', (songs) => {

            this.setState({songs: songs});

        });

        this.socket.on('users', (userCount) => {

            this.setState({users: userCount});

        });

        this.player =  document.getElementById("player");


        this.player.loadeddata = () => {
            this.setState({volume: this.player.volume});
            me.debug('onloadeddata');
        };
        this.source = document.getElementById("source");


        this.progressInterval = setInterval(() => {
            
            if (this.state.currentSong) {

                this.setState({progress: ((parseInt(this.player.currentTime - this.totalOffset, 10) + this.state.currentSong.timeOffset) / this.state.currentSong.duration) * 100});
                //console.log(this.state.currentSong.timeOffset);
            }

        }, 500);

        //window.addEventListener('scroll', this.handleScroll);

        this.initDebugEvents();
    }

    handleScroll = (event) => {

        console.log(document.documentElement.scrollTop);

        if (document.documentElement.scrollTop >= 56) {
            this.setState({fixedTabs: true});
        } else {
            this.setState({fixedTabs: false});
        }

    }

    debug  = (data) => {
        this.setState({debug: [...this.state.debug, data]});
    }

    changeVolume = (event, volume) => {
        this.setState({ volume });
        this.player.volume = volume / 100;
      };

    audioPlay = () => {

        const { currentSong } = this.state;

        this.player.play(); 

    }

    handleInteraction = () => {

        this.setState({ interacted: true });

        this.player.load();
        this.audioPlay();


      };

    audioStop = () => {

        this.player.pause();
        
    }

    audioButton = () => {

        const { playing, waiting } = this.state;

        if (playing) {

            return (
                <IconButton color="inherit" aria-label="Pause" onClick={this.audioStop}>
                    <Pause fontSize="large" />
                </IconButton>
            );
            
        } else {

            if (waiting) {
                return (
                    <IconButton color="inherit" aria-label="Buffering">
                        <CircularProgress color="secondary" size={35}/>
                    </IconButton>
                );
            } else {
                return (
                    <IconButton color="inherit" aria-label="Play" onClick={this.audioPlay}>
                        <PlayArrow fontSize="large" />
                    </IconButton>

                );
            }
        }
    }

    handleChange = (event, value) => {

        this.setState({ value });

    };

    skipSong = () => {

        

    };

    render() {

        const { classes } = this.props;
        const { volumeToggle, debug, currentSong, songs, users, value, fixedTabs } = this.state;

        return (

            <>
                <NavBar/>


                <AppBar position={fixedTabs ? "fixed" : "static"} color="default">
                    <Tabs value={value} onChange={this.handleChange} variant="fullWidth">
                        <Tab label="Queue" />
                        <Tab label="Chat" />
                        <Tab label="Options" />
                    </Tabs>
                </AppBar>

                <Grid container className={classes.container} direction="column" onClick={() => this.setState({volumeToggle: false})} style={{paddingTop: (fixedTabs ? 48 : 8)}}>

                    <audio controls id="player" hidden>
                        <source id="source" type="audio/mpeg" src="/stream"/>
                        Your browser does not support the audio element.
                    </audio>
                    
                    {value === 0 && <>
                        <Typography variant="body2">
                            Live users: {users}
                        </Typography>
                        <Grid item>
                            <Paper className={classes.tableRoot}>

                                {songs.length > 0 && 
                                    <Table className={classes.table}>
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Upcoming</TableCell>
                                                <TableCell></TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                        {songs.map(song => (
                                            <TableRow key={song.id}>
                                                <TableCell padding="dense" align="center">
                                                    {song.title}
                                                </TableCell>
                                                <TableCell align="center" direction="column">
                                                    <Grid item>
                                                        <img src={song.thumb} />
                                                    </Grid>
                                                    <Grid item>
                                                        {this.formatTime(song.duration)}
                                                    </Grid>
                                                    
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        </TableBody>
                                    </Table>
                                }

                                {songs.length === 0 && 
                                    <Typography variant="body1" align="center">
                                        No songs in the queue
                                    </Typography>
                                }
                            </Paper>
                        </Grid>
                    </>}
                    {value === 1 && <Grid item xs={12}><Chat messages={this.state.messages} socket={this.socket}/></Grid> }
                    {value === 2 && <>

                        <Button variant="contained" color="secondary" onClick={this.skipSong}>
                        </Button>

                        {this.debugMode && debug.map((item) => (

                            <Grid item>
                                <Typography variant="body2">
                                    {item}
                                </Typography>
                            </Grid>

                        ))} 
                    </>}

                </Grid>

                <AppBar position="fixed" color="default" className={classes.appBar} onMouseLeave={() => this.setState({volumeToggle: false})}>

                    <LinearProgress variant="determinate" color="secondary" value={this.state.progress} />
                    <Toolbar className={classes.toolbar}>

                        {this.audioButton()}
                        
                        <Grid item zeroMinWidth>
                            <Typography variant="body2" align="center" noWrap>
                                {currentSong ? currentSong.title : 'N/A'}
                            </Typography>
                            <Typography variant="body1" align="center">
                                {this.time()}
                            </Typography>
                        </Grid>

                        <IconButton color="inherit" className={classes.volumePad} onClick={() => {this.setState({volumeToggle: !this.state.volumeToggle})}}>
                            <Volume />
                        </IconButton>

                        <Slide direction="left" in={volumeToggle} mountOnEnter unmountOnExit>
                            <div className={classes.volume}>
                                <Slider
                                    color="secondary"
                                    classes={{ container: classes.slider }}
                                    value={this.state.volume}
                                    onChange={this.changeVolume}
                                />
                            </div>
                        </Slide>

                    </Toolbar>
                </AppBar>
                    

                <Dialog
                    open={!this.state.interacted}
                    onClose={this.handleInteraction}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                    >
                        <DialogTitle id="alert-dialog-title">{"Welcome to JRadio"}</DialogTitle>
                        <DialogContent>
                            <DialogContentText id="alert-dialog-description">
                                Submit Youtube and Soundcloud links to listen to on a synchronized live radio with your friends. 
                                Start listening now!
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleInteraction} color="secondary" autoFocus variant="contained" style={{color: 'white'}}>
                                Listen Now
                            </Button>
                        </DialogActions>
                </Dialog>
            </>
        )
    }

    formatTime(sec) {
        var hrs = Math.floor(sec / 3600);
        var min = Math.floor((sec - (hrs * 3600)) / 60);
        var seconds = sec - (hrs * 3600) - (min * 60);
        seconds = Math.round(seconds * 100) / 100
       
        var result = '';

        result += hrs > 0 ? ((hrs < 10 ? "0" + hrs : hrs) + ":") : '';
            
        result += (min < 10 ? "0" + min : min);

        result += ":" + (seconds < 10 ? "0" + seconds : seconds);
        return result;
     }

    time = () => {

        const { currentSong } = this.state;
        const { classes } = this.props;

        if (currentSong) {

            return (
                <>
                    <Typography inline variant="overline" className={classes.live}><Dot className={classes.liveDot}/>LIVE</Typography>{this.formatTime(Math.round((this.player.currentTime - this.totalOffset) + currentSong.timeOffset))} / {this.formatTime(currentSong.duration)}
                </>
            );
        } else {
            return (
                <>
                    0:00 / 0:00
                </>
            );
        }
    }

    network = () => {

        let status = '';

        if (this.player) {

            switch(this.player.networkState) {

                case 0:
                    status = 'NETWORK_EMPTY';
                break;
                case 1:
                    status = 'NETWORK_IDLE '
                break;
                case 2:
                    status = 'NETWORK_LOADING'
                break;
                case 3:
                    status = 'NETWORK_NO_SOURCE'
                break;
            }   
        }

        return status;

    }
    ready = () => {

        let status = '';

        if (this.player) {

            switch(this.player.readyState) {

                case 0:
                    status = 'HAVE_NOTHING ';
                break;
                case 1:
                    status = 'HAVE_METADATA  '
                break;
                case 2:
                    status = 'HAVE_CURRENT_DATA '
                break;
                case 3:
                    status = 'HAVE_FUTURE_DATA '
                break;
                case 4:
                    status = 'HAVE_ENOUGH_DATA  '
                break;
            }   
        }

        return status;

    }

    initDebugEvents = () => {
        let me = this;
        this.player.onloadstart = function() {
            me.debug('onloadstart');
        }
        this.player.ondurationchange = function() {
            me.debug('ondurationchange');
        }
        this.player.canplay = () => {
            me.debug('canplay');
            this.setState({waiting: false});
        }
        this.player.onplaying = () => {
            me.debug('onplaying');

            if (this.state.currentSong.firstPlay) {

                let offset = (Date.now() - new Date(this.state.currentSong.started)) / 1000;

                console.log('playing - setting offset to ',offset);
                this.setState({playing: true, waiting: false, currentSong: {...this.state.currentSong, firstPlay: false, timeOffset: offset}});


            } else {

                this.setState({playing: true, waiting: false});
            }
        }
        this.player.onprogress = function() {
            me.debug('onprogress');   
        }
        this.player.onstalled = function() {
            me.debug('onstalled');
        }
        this.player.onsuspend = function() {
            me.debug('onsuspend');
        }
        this.player.onwaiting = () => {
            me.debug('onwaiting');

            this.setState({waiting: true});
        }
        this.player.onabort = function() {
            me.debug('onabort');
        }
        this.player.onerror = function() {
            me.debug('onerror: ',me.player.onerror.code);
            
        }
        this.player.oncanplaythrough = () => {
            me.debug('oncanplaythrough');
            this.setState({waiting: false});
        }
        this.player.onpause = () => {
            me.debug('onpause');
            this.setState({playing: false, waiting: false});
        } 
    }
}

export default withStyles(styles)(index);