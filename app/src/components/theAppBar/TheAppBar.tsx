import { AppBar, Avatar, Button, IconButton, Menu, MenuItem, SvgIcon, Toolbar, Typography, withStyles, Tooltip } from "@material-ui/core";
import { mdiMenu, mdiArrowLeft } from '@mdi/js';
import React, { Component } from "react";
import firebase from "../../firebase";
import { Link } from "react-router-dom";
import ReactDOM from "react-dom";

const _styles = {
    title: {
        flexGrow: 1,
    }
}

const styles = () => (_styles);

type TheAppBarState = {
    user: firebase.User | null,
    userMenuOpen: boolean,
}

type TheAppBarProps = {
    classes: any,
    goBackTo?: string,
}

class TheAppBar extends Component<Readonly<TheAppBarProps>, TheAppBarState>{


    state: TheAppBarState = {
        user: null,
        userMenuOpen: false,
    }

    componentDidMount() {
        const user = firebase.auth().currentUser;

        this.setState({
            user,
        })

        firebase.auth().onIdTokenChanged((user) => {
            this.setState({
                user,
            })
        })
    }

    render() {
        const { classes, goBackTo } = this.props;
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
                    {this.state.user && (
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
                                <Button
                                    variant="outlined"
                                    color="inherit"
                                    onClick={this.handleSignInButtonClick}
                                >Sign in</Button>
                            </div>
                        )}
                </Toolbar>
            </AppBar>
        </>
    }

    handleSignInButtonClick = async () => {
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            const result = await firebase.auth().signInWithPopup(provider);
            const { user } = result;
            if (user) {
                const u = await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .get()
                if (u.exists) {
                    await u.ref.update(user.toJSON());
                } else {
                    await u.ref.set(user.toJSON());
                }
            }
        } catch (err) {
            console.error(err);
        }

    }

    handleSignOutButtonClick = async () => {
        await firebase.auth().signOut();
    }

}

export default withStyles(styles)(TheAppBar);
