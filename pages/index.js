import React, { Component } from 'react';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import NavBar from './components/NavBar';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ytdl from 'ytdl-core';
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
            token: null

        }
    }

    componentDidMount() {

        this.socket = io();
        
        this.socket.on('song', (token) => {


            this.setState({token: jwt_decode(token)});
            console.log(this.state.token);

            //var player =  document.getElementById("player");
            //document.getElementById("source").src = "/stream?link="+song.link;
            //player.load();
        });


    }

    playSong = () => {

        const { currentSong } = this.state;

        //if (currentSong) {

            var player =  document.getElementById("player");
            document.getElementById("source").src = "/stream";
            player.load();
            player.currentTime = this.state.token.time;
            player.play();
            /*var player =  document.getElementById("player");
            document.getElementById("source").src = "/stream?link="+currentSong.link;
            player.load();
            player.currentTime = currentSong.time;
            player.play();*/
        //}
    }




    render() {

        const { classes } = this.props;

        return (


            <div>
                <NavBar />
                <Grid container className={classes.container}>

                    <Grid item>
                        <Button variant="contained" onClick={this.playSong}>Join Room</Button>
                        
                        <audio controls id="player">
                            <source type="audio/mp4" id="source" />
                            Your browser does not support the audio element.
                        </audio>
                    </Grid>


                </Grid>

            </div>



        )
    }
}

export default withStyles(styles)(index);