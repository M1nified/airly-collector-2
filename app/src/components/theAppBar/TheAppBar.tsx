import { AppBar, Avatar, Box, IconButton, Menu, MenuItem, SvgIcon, Toolbar, Tooltip, Typography, withStyles } from "@material-ui/core";
import { mdiArrowLeft } from '@mdi/js';
import React, { Component } from "react";
import ReactDOM from "react-dom";
import { Link } from "react-router-dom";
import firebaseApp from "../../firebase/firebase";
import { SignInWithGoogleButton } from "../signInWithGoogleButton/SignInWithGoogleButton";

const _styles = {
    title: {
        flexGrow: 1,
    }
}

const styles = () => (_styles);

type TheAppBarState = {
    user: firebaseApp.User | null,
    userMenuOpen: boolean,
}

type TheAppBarProps = {
    classes: any,
    goBackTo?: string,
    hideSignIn?: boolean
}

class TheAppBar extends Component<Readonly<TheAppBarProps>, TheAppBarState>{


    state: TheAppBarState = {
        user: null,
        userMenuOpen: false,
    }

    componentDidMount() {
        firebaseApp.auth().onAuthStateChanged((user) => {
            this.setState({
                user,
            })
        })
    }

    render() {
        const { classes, goBackTo, hideSignIn } = this.props;
        return <>
            <AppBar position="static">
                <Toolbar>
                    {
                        goBackTo
                            ? <Tooltip title="Go back">
                                <Link to={goBackTo} style={{ color: 'inherit' }}>
                                    <IconButton
                                        edge="start"
                                        color="inherit"
                                    // aria-label="open drawer"
                                    >
                                        <SvgIcon><path d={mdiArrowLeft} /></SvgIcon>
                                    </IconButton>
                                </Link>
                            </Tooltip>
                            : <IconButton
                                edge="start"
                                color="inherit"
                                disabled
                            >
                                <SvgIcon><path d={mdiArrowLeft} /></SvgIcon>
                            </IconButton>
                    }
                    <Typography variant="h6" noWrap className={classes.title}>
                        Airly Collector
                    </Typography>
                    {!hideSignIn && (
                        this.state.user && (
                            <div>
                                <IconButton
                                    aria-label="account of current user"
                                    aria-controls="menu-appbar"
                                    aria-haspopup="true"
                                    onClick={() => { this.setState({ userMenuOpen: true }) }}
                                    color="inherit"
                                >
                                    <Avatar
                                        alt={this.state.user.displayName || ""}
                                        src={this.state.user.photoURL || ""}
                                    />
                                </IconButton>
                                <Menu
                                    id="menu-appbar"
                                    anchorEl={(x) => ReactDOM.findDOMNode(this) as Element}
                                    anchorOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                    keepMounted
                                    transformOrigin={{
                                        vertical: 'top',
                                        horizontal: 'right',
                                    }}
                                    open={this.state.userMenuOpen}
                                    onClose={() => { this.setState({ userMenuOpen: false }) }}
                                >
                                    <MenuItem disabled >{this.state.user.displayName}</MenuItem>
                                    <MenuItem onClick={() => { this.handleSignOutButtonClick(); this.setState({ userMenuOpen: false }) }}>Sign out</MenuItem>
                                </Menu>
                            </div>
                        ) || (
                            <div>
                                <SignInWithGoogleButton />
                            </div>
                        )
                    )}
                    <Box hidden={!hideSignIn}>
                        <IconButton
                            disabled
                            aria-label="account of current user"
                            aria-controls="menu-appbar"
                            aria-haspopup="true"
                            color="inherit"
                        >
                            <Avatar />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>
        </>
    }

    handleSignOutButtonClick = async () => {
        await firebaseApp.auth().signOut();
    }

}

export default withStyles(styles)(TheAppBar);
