import React, { Component } from 'react';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import TextField from '@material-ui/core/TextField';
import Slide from '@material-ui/core/Slide';
import axios from 'axios';

const styles = theme => ({
    root: {
      flexGrow: 1,
    },
    grow: {
      flexGrow: 1,
    },
    icon: {
      marginLeft: theme.spacing.unit,
    },
    white: {
      color: 'white'
    }

  
  });

  function Transition(props) {
    return <Slide direction="up" {...props} />;
  }

  class NavBar extends Component {


    state = {

      addSongOpen: false

    };

    handleClose = () => {

      this.setState({addSongOpen: false});

    }

    handleOpen = () => {

      this.setState({addSongOpen: true});
    
    }

    handleChange = e => {

      this.setState({[e.target.id]: e.target.value});

    }

    handleSubmit = () => {

      //post request to back end add song
      axios.get('/add', {
        params: {
          link: this.state.link
        }
      })
      .then((response) => {
        console.log(response);
        this.handleClose();
      })
      .catch(function (error) {
        console.log(error);
      })
      

    }

    render() {
      const { classes } = this.props;

      return (
          <div className={classes.root}>
              <AppBar position="static" color="primary">
                <Toolbar>
                    <Typography variant="h6" color="inherit" className={classes.grow}>
                      J Radio
                    </Typography>
                    <Button variant="contained" color="secondary" onClick={this.handleOpen}>
                      Add Song
                    </Button>
                </Toolbar>
              </AppBar>
  
              <Dialog
                open={this.state.addSongOpen}
                onClose={this.handleClose}
                aria-labelledby="form-dialog-title"
                TransitionComponent={Transition}
              >
                <DialogTitle id="form-dialog-title">Add song</DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    Copy and paste a valid Youtube or Soundcloud link here to submit to the live queue.
                  </DialogContentText>
                  <TextField
                    autoFocus
                    margin="dense"
                    id="link"
                    label="Song link"
                    fullWidth
                    onChange={this.handleChange}
                  />
                </DialogContent>
                <DialogActions>
                  <Button onClick={this.handleClose} color="secondary" variant="outlined" className={classes.white}>
                    Cancel
                  </Button>
                  <Button onClick={this.handleClose} color="secondary" variant="outlined" className={classes.white} onClick={this.handleSubmit}>
                    Submit link
                  </Button>
                </DialogActions>
              </Dialog>
        
              
          </div>
      )
    }
  }
  




export default withStyles(styles)(NavBar);