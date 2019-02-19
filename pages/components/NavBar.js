import React, { Component } from 'react'
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import { withStyles } from '@material-ui/core/styles';

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
  
  });

  

  function NavBar(props) {

    const { classes } = props;

    return (
        <div className={classes.root}>
            <AppBar position="static" color="primary">
              <Toolbar>
                  <Typography variant="h6" color="inherit" className={classes.grow}>
                    J Radio
                  </Typography>
                  <Button variant="contained" color="secondary">
                    Add Song
                  </Button>

              </Toolbar>
            </AppBar>
        </div>
    )
}


export default withStyles(styles)(NavBar);