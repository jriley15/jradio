import React, { Component } from 'react';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import NavBar from './components/NavBar';
import Grid from '@material-ui/core/Grid';
import jwt_decode from 'jwt-decode';
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

const styles = theme => ({
    root: {
      textAlign: 'center',
      paddingTop: theme.spacing.unit * 20,
    },

    container: {
        padding: theme.spacing.unit
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
            debug: []

        }
    }

    componentDidMount() {

        this.socket = io();
        
        this.socket.on('song', (token) => {

            this.setState({token: jwt_decode(token)});
            console.log(this.state.token);

            //var player =  document.getElementById("player");
            //document.getElementById("source").src = "/stream";
            //player.load();
            //player.currentTime = this.state.token.time;
            //player.play();
            //var player =  document.getElementById("player");
            //document.getElementById("source").src = "/stream?link="+song.link;
            //player.load();
        });

        this.player =  document.getElementById("player");
        this.player.loadeddata = () => {
            this.setState({volume: this.player.volume});
        };
        this.source = document.getElementById("source");
        this.progressInterval = setInterval(() => {
            
            if (this.state.token) {

                this.setState({progress: (this.player.currentTime / this.state.token.duration) * 100});
            }

        }, 500);

        let me = this;
        this.player.onloadstart = function() {
            me.debug('onloadstart');
        }
        this.player.ondurationchange = function() {
            me.debug('ondurationchange');
        }
        this.player.onloadedmetadata = function() {
            me.debug('onloadedmetadata');
        }
        this.player.canplay = function() {
            me.debug('canplay');
        }
        this.player.onloadeddata = function() {
            me.debug('onloadeddata');
        }
        this.player.onplaying = function() {
            me.debug('onplaying');
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
        this.player.onwaiting = function() {
            me.debug('onwaiting');
        }
        this.player.onabort = function() {
            me.debug('onabort');
        }
        this.player.onerror = function() {
            me.debug('onerror');
        }
        this.player.oncanplaythrough = function() {
            me.debug('oncanplaythrough');
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

        //if (currentSong) {

            this.player.play(); 
            this.setState({playing: true});

            //var player =  document.getElementById("player");
            //document.getElementById("source").src = "/stream";
            //player.load();
            //player.currentTime = this.state.token.time;
            //player.play();
            /*var player =  document.getElementById("player");
            document.getElementById("source").src = "/stream?link="+currentSong.link;
            player.load();
            player.currentTime = currentSong.time;
            player.play();*/
        //}
    }


    audioStop = () => {

        this.player.pause();
        this.setState({playing: false});

    }

    audioButton = () => {

        const { playing } = this.state;

        if (playing) {
            return (
                <IconButton color="inherit" aria-label="Pause" onClick={this.audioStop}>
                    <Pause fontSize="large" />
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
        if (this.state.token) {
            return (
                <>
                    {this.formatTime(Math.round(this.player.currentTime))} / {this.formatTime(this.state.token.duration)}
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


    render() {

        const { classes } = this.props;
        const { volumeToggle, debug } = this.state;

        return (

            <div>
                <NavBar />
                <Grid container className={classes.container} direction="column">

                    <audio controls id="player" preload="automatic">
                        <source id="source" src="/stream" type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>

                    {debug.map((item) => (

                        <Grid item>
                            <Typography variant="body2">
                                {item}
                            </Typography>
                        </Grid>

                    ))} 

                </Grid>
                <AppBar position="fixed" color="default" className={classes.appBar}>

                    <LinearProgress variant="determinate" color="secondary" value={this.state.progress} />

                    <Toolbar className={classes.toolbar}>

                        {this.audioButton()}
                        
                        <div>
                            <Typography variant="body2" align="center">
                                Title
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
            </div>
        )
    }
}

export default withStyles(styles)(index);