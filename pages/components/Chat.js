import React, { Component } from 'react'
import { withStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Fab from '@material-ui/core/Fab';
import Send from '@material-ui/icons/Send';
import Avatar from '@material-ui/core/Avatar';
import Person from '@material-ui/icons/Person';
import Slide from '@material-ui/core/Slide';
import Message from '@material-ui/icons/Message';
import { Typography } from '@material-ui/core';
import DownArrow from '@material-ui/icons/ArrowDownward';
import TextField from '@material-ui/core/TextField';
import grey from '@material-ui/core/colors/grey';
import InputAdornment from '@material-ui/core/InputAdornment';
import IconButton from '@material-ui/core/IconButton';

const styles = theme => ({
    root: {
        
    },

    messageForm: {
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,//theme.spacing.unit * 8,
        width: '100%',
        paddingLeft: theme.spacing.unit,
        paddingRight: theme.spacing.unit,
        paddingTop: theme.spacing.unit,
        backgroundColor: grey[900],
        zIndex: 5000
    },

    textField: {

       
    },

    container: {
        //paddingBottom: (theme.spacing.unit * 7), //+ (theme.spacing.unit * 7),
        overflowY: 'auto',
        maxHeight: 'calc(100vh - ' + (theme.spacing.unit * 23) + 'px)',
        scrollBehaviour: 'smooth',
        width: 'inherit'
    },

    fab: {
        position: 'fixed',
        bottom: theme.spacing.unit * 9,
        right: theme.spacing.unit
    },

    avatar: {
        margin: theme.spacing.unit,
        width: 24,
        height: 24
    },

    messageContainer: {
        paddingTop: theme.spacing.unit
    },

    messageName: {
        marginRight: theme.spacing.unit
    },

    scrollDown: {
        position: 'fixed',
        bottom: theme.spacing.unit * 9,
        left: 0,
        right: 0,
        margin: '0 auto',
    }
});

class Chat extends Component {
  
  
    constructor(props) {

        super(props);

        this.state = {

            msgFormToggle: false,
            scrollDown: false,
            autoScroll: true,
            message: ''

        }
        
    }

    componentDidMount() {

        this.chatContainer = document.getElementById('chat');

        this.checkScroll();
        this.checkAutoScroll();


    }

    handleScroll = e => {

        this.checkScroll();

    }

    checkAutoScroll = () => {

        if (this.state.autoScroll) {
            this.chatContainer.scrollTop = this.chatContainer.scrollHeight;
        }

    }


    checkScroll = () => {

        if (Math.round(this.chatContainer.scrollTop) === (this.chatContainer.scrollHeight - this.chatContainer.offsetHeight)) {

            this.setState({scrollDown: false});

        } else {

            this.setState({scrollDown: true});
        }
    }

    scrollToBottom = () => {

        this.chatContainer.scrollTop = this.chatContainer.scrollHeight;

    }

    handleChange = e => {

        this.setState({[e.target.id]: e.target.value});
  
    }

    toggleMessageForm = () => {

        this.setState({msgFormToggle: !this.state.msgFormToggle});
        //this.state.form.focus();
        //this.checkAutoScroll();
    }

    sendMessage = () => {

        if (this.state.message) {

            this.props.socket.emit('message', this.state.message);

            this.setState({message: ''});
        }

    }

    handleKeyPress = e => {

        if (e.key === 'Enter') {

            this.sendMessage();

        }

    }

    componentDidUpdate(oldProps) {

        if (oldProps.messages !== this.props.messages) {

            this.checkAutoScroll();

        }

    }

  
    render() {

        const { classes } = this.props;
        const { messages, msgFormToggle, scrollDown } = this.state;

        return (
            <div className={classes.root}>
                <Grid id="chat" container direction="row" className={classes.container} onScroll={this.handleScroll} onClick={() => this.setState({msgFormToggle: false})}>                  

                    {this.props.messages.map((msg) => (

                        <Grid item xs={12} key={msg.id}>

                            <Grid container direction="row">
                                <Grid item>
                                    <Avatar className={classes.avatar}>
                                        <Person/>
                                    </Avatar>
                                </Grid>
                                <Grid item className={classes.messageContainer} xs={10} style={{wordWrap: 'break-word'}}>

                                    <Typography variant="body1" inline><b>{msg.name}</b> {msg.message}</Typography>
                                </Grid>
                            </Grid>

                        </Grid>

                    ))}

                    
                </Grid>
                <Slide direction="up" in={msgFormToggle} mountOnEnter unmountOnExit >
                    <div className={classes.messageForm}>
                        <TextField
                            id="message"
                            label="Message"
                            className={classes.textField}
                            value={this.state.message}
                            onChange={this.handleChange}
                            margin="none"
                            variant="filled"
                            fullWidth
                            autoFocus
                            onKeyPress={this.handleKeyPress}
                            InputProps={{
                            endAdornment:
                                <InputAdornment position="end">
                                  <IconButton
                                    aria-label="Toggle password visibility"
                                    onClick={this.sendMessage}
                                  >
                                    <Send />
                                  </IconButton>
                                </InputAdornment>
                              
                            }}
                        />
                        
                    </div>
                </Slide>

                <Slide direction="left" in={true}>
                    <Fab color="primary" aria-label="Send message" size="small" className={classes.fab} onClick={this.toggleMessageForm}>
                        <Message />
                    </Fab>
                </Slide>

                <Slide direction="up" in={scrollDown}>
                    <Fab color="primary" aria-label="Scroll Down" size="small" className={classes.scrollDown} onClick={() => this.scrollToBottom()}>
                        <DownArrow />
                    </Fab>
                </Slide>
            </div>
        )
    }
}

export default withStyles(styles)(Chat);