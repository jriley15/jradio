import React, { Component } from 'react';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import NavBar from './components/NavBar';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import jwt_decode from 'jwt-decode';

const styles = theme => ({
    root: {
      textAlign: 'center',
      paddingTop: theme.spacing.unit * 20,
    },

    container: {
        padding: theme.spacing.unit
    }


  });


class index extends Component {



    constructor(props) {
        super(props);
        
        this.state = {


            currentSong: null,
            token: null,
            types: []
            

        }

        //this.audio = new Audio();
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
        this.source = document.getElementById("source");

        let types = [];

        if (this.player.canPlayType('audio/mpeg')) {
            types.push('mpeg ');
        }
        if (this.player.canPlayType('audio/mp4')) {
            types.push('mp4 ');
        }
        if (this.player.canPlayType('audio/ogg')) {
            types.push('ogg ');
        }
        this.setState({types: types});
    }

    audioPlay = () => {

        const { currentSong } = this.state;

        //if (currentSong) {

            this.player.play(); 


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

    }


    render() {

        const { classes } = this.props;

        return (


            <div>
                <NavBar />
                <Grid container className={classes.container}>

                    <Grid item>
                        <Button variant="contained" onClick={this.audioPlay}>Play</Button>
                        <Button variant="contained" onClick={this.audioStop}>Stop</Button>
                    </Grid>

                    <audio controls id="player" preload="automatic">
                        <source id="source" src="/stream" type="audio/mpeg" />
                        Your browser does not support the audio element.
                    </audio>
                    {this.state.types}

                </Grid>

            </div>



        )
    }
}

export default withStyles(styles)(index);