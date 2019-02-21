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


const styles = theme => ({
    root: {

    },

    messageForm: {
        position: 'fixed',
        bottom: theme.spacing.unit * 8,
        width: '100%'
    },

    textField: {

        marginLeft: theme.spacing.unit,
        marginRight: theme.spacing.unit
    },

    container: {
        //paddingBottom: (theme.spacing.unit * 7), //+ (theme.spacing.unit * 7),
        overflowY: 'auto',
        maxHeight: 'calc(100vh - ' + (theme.spacing.unit * 23) + 'px)',
        scrollBehaviour: 'smooth' 
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

            messages: ['Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test Test ', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test', 'Test'],//props.messages
            msgFormToggle: true,
            scrollDown: false,
            autoScroll: true,

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
  
  
    render() {

        const { classes } = this.props;
        const { messages, msgFormToggle, scrollDown } = this.state;

        return (
            <div className={classes.root}>
                <Grid id="chat" container direction="row" className={classes.container} onScroll={this.handleScroll}>                  

                    {messages.map((msg) => (

                        <Grid item xs={12}>

                            <Grid container direction="row">
                                <Grid item>
                                    <Avatar className={classes.avatar}>
                                        <Person/>
                                    </Avatar>
                                </Grid>
                                <Grid item className={classes.messageContainer} xs={10}>
                                    <Typography variant="body1" inline className={classes.messageName}><b>User</b></Typography>

                                    <Typography variant="body1" inline>{msg}</Typography>
                                </Grid>
                            </Grid>

                        </Grid>

                    ))}

                    
                </Grid>
                <Slide direction="up" in={!msgFormToggle} className={classes.messageForm}>
                    <TextField
                        id="message"
                        label="Message"
                        className={classes.textField}
                        value={this.state.message}
                        onChange={this.handleChange}
                        margin="normal"
                        variant="filled"
                    />
                </Slide>

                <Slide direction="left" in={msgFormToggle}>
                    <Fab color="primary" aria-label="Send message" size="small" className={classes.fab} onClick={() => this.setState({msgFormToggle: false})}>
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