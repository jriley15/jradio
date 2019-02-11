import React, { Component } from 'react'
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import { withStyles } from '@material-ui/core/styles';

const styles = {
    root: {
      flexGrow: 1,
    },
    grow: {
      flexGrow: 1,
    },
    menuButton: {
      marginLeft: -12,
      marginRight: 20,
    },
  };

  

  function NavBar(props) {

    const { classes } = props;

    return (
        <div className={classes.root}>
            <AppBar position="static" color="primary">
            <Toolbar>
                <Typography variant="h6" color="inherit" className={classes.grow}>
                J Radio
                </Typography>
                <Button color="inherit">Login</Button>
            </Toolbar>
            </AppBar>
        </div>
    )
}


export default withStyles(styles)(NavBar);