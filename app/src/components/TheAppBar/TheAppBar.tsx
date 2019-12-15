import { AppBar, Badge, IconButton, InputBase, Toolbar, Typography, SvgIcon, Menu, MenuItem, Button, makeStyles, withStyles, Avatar } from "@material-ui/core";
import React, { Component, ClassAttributes } from "react";
import firebase from "./../../firebase";
import { mdiMenu, mdiMagnify, mdiFaceProfile } from '@mdi/js'

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
        const { classes } = this.props;
        return <>
            <AppBar position="static">
                <Toolbar>
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="open drawer"
                    >
                        <SvgIcon><path d={mdiMenu} /></SvgIcon>
                    </IconButton>
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
                                // anchorEl={anchorEl}
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
                }else{
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
