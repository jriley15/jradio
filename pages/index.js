import React, { Component } from 'react';
import io from 'socket.io-client';
import { withStyles } from '@material-ui/core/styles';
import NavBar from './components/NavBar';
import Grid from '@material-ui/core/Grid';
import Button from '@material-ui/core/Button';
import ytdl from 'ytdl-core';


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


            currentSong: null

        }
    }

    componentDidMount() {

        this.socket = io();
        
        this.socket.on('song', (song) => {

            console.log(song);
            this.setState({currentSong: song});
            //var player =  document.getElementById("player");
            //document.getElementById("source").src = "/stream?link="+song.link;
            //player.load();
        });


    }

    playSong = () => {

        const { currentSong } = this.state;

        if (currentSong) {

            var player =  document.getElementById("player");
            document.getElementById("source").src = "/stream?link="+currentSong.link;
            player.load();
            //player.currentTime = currentSong.time;
            player.play();
            /*var player =  document.getElementById("player");
            document.getElementById("source").src = "/stream?link="+currentSong.link;
            player.load();
            player.currentTime = currentSong.time;
            player.play();*/
        }
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