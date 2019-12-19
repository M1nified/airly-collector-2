import { ButtonBase, makeStyles } from '@material-ui/core';
import React from 'react';
import firebaseApp from '../../firebase/firebase';
import btnDisabled from './images/btn_google_signin_light_disabled_web.png';
import btnNormal from './images/btn_google_signin_light_normal_web.png';
import btnPressed from './images/btn_google_signin_light_pressed_web.png';

type SignInWithGoogleButtonProps = {
    onUserSignedIn?(): any,
}

const useStyles = makeStyles({
    root: {
        backgroundImage: `url(${btnNormal})`,
        width: 191,
        height: 46,
        '&:hover': {
            backgroundImage: `url(${btnPressed})`,
        },
        '&:disabled': {
            backgroundImage: `url(${btnDisabled})`,
        }
    }
});

export function SignInWithGoogleButton(props: SignInWithGoogleButtonProps) {
    const classes = useStyles();
    const handleOnClick = async () => {
        const provider = new firebaseApp.auth.GoogleAuthProvider();
        const credential = await firebaseApp.auth().signInWithRedirect(
            provider
        )
        typeof props.onUserSignedIn === 'function' && props.onUserSignedIn();
        return credential;
    }
    return <>
        <ButtonBase
            type="button"
            className={classes.root}
            onClick={handleOnClick}
        />
    </>
}
