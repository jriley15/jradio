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
            waiting: false

        }

        this.debugMode = false;
    }

    componentDidMount() {

        this.socket = io();
        
        this.socket.on('song', (data) => {

            console.log('new song: ',data);

            let song = data;

            //song.timeOffset = new Date(Date.now() - song.started).getSeconds();

            this.setState({currentSong: song});
            
            if (this.state.waiting) {

                this.player.load();
                this.player.play();
            }

        });

        this.player =  document.getElementById("player");


        this.player.loadeddata = () => {
            this.setState({volume: this.player.volume});
            me.debug('onloadeddata');
        };
        this.source = document.getElementById("source");


        this.progressInterval = setInterval(() => {
            
            if (this.state.currentSong) {

                this.setState({progress: ((this.player.currentTime + this.state.currentSong.timeOffset) / this.state.currentSong.duration) * 100});
            }

        }, 500);

        this.initDebugEvents();
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
                        <CircularProgress color="secondary" />
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

    render() {

        const { classes } = this.props;
        const { volumeToggle, debug, currentSong } = this.state;

        return (

            <>
                <NavBar/>
                <Grid container className={classes.container} direction="column" onClick={() => this.setState({volumeToggle: false})}>

                    <audio controls id="player" preload="auto" autoPlay={true}>
                        <source id="source" type="audio/mpeg" src="http://98.171.80.97:3000/stream"/>
                        Your browser does not support the audio element.
                    </audio>

                    {this.debugMode && debug.map((item) => (

                        <Grid item>
                            <Typography variant="body2">
                                {item}
                            </Typography>
                        </Grid>

                    ))} 

                </Grid>
                <AppBar position="fixed" color="default" className={classes.appBar} onMouseLeave={() => this.setState({volumeToggle: false})}>

                    <LinearProgress variant="determinate" color="secondary" value={this.state.progress} />
                    <Toolbar className={classes.toolbar}>

                        {this.audioButton()}
                        
                        <div>
                            <Typography variant="body2" align="center">
                                {currentSong ? currentSong.title : 'N/A'}
                            </Typography>
                            <Typography variant="body1" align="center">
                                {this.time()}
                            </Typography>
                        </div>

                        <IconButton color="inherit" onClick={() => {this.setState({volumeToggle: !this.state.volumeToggle})}}>
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
                                Submit Youtube and Soundcloud links to listen to on a synchronized radio with your friends. 
                                Start listening now!
                            </DialogContentText>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={this.handleInteraction} color="secondary" autoFocus variant="outlined" style={{color: 'white'}}>
                                Start Listening
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

        if (currentSong) {

            return (
                <>
                    {this.formatTime(Math.round(this.player.currentTime + currentSong.timeOffset))} / {this.formatTime(currentSong.duration)}
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
        this.player.canplay = function() {
            me.debug('canplay');
        }
        this.player.onplaying = () => {
            me.debug('onplaying');

            this.setState({playing: true, waiting: false, currentSong: {...this.state.currentSong, timeOffset: new Date(Date.now() - this.state.currentSong.started).getSeconds()}});

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
        this.player.oncanplaythrough = function() {
            me.debug('oncanplaythrough');
        }
        this.player.onpause = () => {
            me.debug('onpause');
            this.setState({playing: false});
        } 
    }
}

export default withStyles(styles)(index);