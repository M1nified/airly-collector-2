import { Box, Button, Container, Fab, Paper, Step, StepLabel, Stepper, SvgIcon, TextField, Tooltip, Typography, Zoom, CircularProgress, Backdrop } from "@material-ui/core";
import { mdiPencil } from "@mdi/js";
import React, { Component, SyntheticEvent } from "react";
import { Installation } from "../../../../shared/src/models/AirlyApiModels";
import { InstallationsTable } from "../../components/installationsTable/InstallationsTable";
import TheAppBar from '../../components/theAppBar/TheAppBar';
import firebaseApp from "../../firebase/firebase";
import { addUserInstallation } from '../../firebase/users';
import { SignInWithGoogleButton } from "../../components/signInWithGoogleButton/SignInWithGoogleButton";

type HomeViewState = {
    user: firebaseApp.User | null,
    editMode: boolean,
    userInstallationsCount: number,
    newInstallationId: string,
    activeStep: number,
    initIsDone: boolean,
}

type HomeViewProps = {
}

export class HomeView extends Component<HomeViewProps, HomeViewState>{

    state: HomeViewState = {
        user: null,
        editMode: false,
        userInstallationsCount: 0,
        newInstallationId: "",
        activeStep: 0,
        initIsDone: false,
    }


    unsubAuthStateChanged?: firebaseApp.Unsubscribe

    async componentDidMount() {
        const setUserInstallationsCount = async (user: firebase.User | null) => {
            if (!user) {
                this.setState({
                    userInstallationsCount: 0,
                    initIsDone: true,
                });
                return;
            }
            const doc = await firebaseApp.firestore()
                .collection('users')
                .doc(user.uid)
                .get();
            const installations = doc.data()?.installations ?? [];
            this.setState({
                userInstallationsCount: installations.length,
                initIsDone: true,
            });
        }

        this.unsubAuthStateChanged = firebaseApp.auth().onAuthStateChanged((user) => {
            setUserInstallationsCount(user);
            this.setState({
                user,
                activeStep: !user ? 0 : 1,
            });
        })
    }

    componentWillUnmount() {
        this.unsubAuthStateChanged?.call(this);
    }

    render() {
        const { editMode, userInstallationsCount, activeStep, initIsDone, user } = this.state;
        return <>
            <TheAppBar hideSignIn={activeStep === 0} />
            {
                userInstallationsCount === 0
                    ? <>
                        <Container>
                            <Paper
                                style={{
                                    padding: 10,
                                    marginTop: 10,
                                    textAlign: "center",
                                }}
                            >
                                <Typography className="h2">
                                    Welcome to Airly Collector
                    </Typography>
                                <Stepper activeStep={activeStep}>
                                    <Step
                                        completed={!!user}
                                    >
                                        <StepLabel>Sign in</StepLabel>
                                    </Step>
                                    <Step
                                        completed={false}
                                    >
                                        <StepLabel>Add installation</StepLabel>
                                    </Step>
                                </Stepper>
                                {
                                    this.getStepContent()
                                }
                            </Paper>
                        </Container>
                    </>
                    : <>
                        <InstallationsTable
                            editMode={editMode}
                            onEditModeOff={() => this.setState({
                                editMode: false,
                            })}
                        />
                        {
                            <Zoom
                                in={!editMode}
                                style={{
                                    right: "10px",
                                    bottom: "10px",
                                    position: "fixed",
                                }}
                            >
                                <Tooltip
                                    title="Edit/Add installations"
                                >
                                    <Fab
                                        color="primary"
                                        onClick={() => this.setState({
                                            editMode: true,
                                        })}
                                    >
                                        <SvgIcon><path d={mdiPencil} /></SvgIcon>
                                    </Fab>
                                </Tooltip>
                            </Zoom>
                        }
                    </>
            }
            <Backdrop
                open={!initIsDone}
                style={{
                    zIndex: 1,
                }}
            >
                <CircularProgress color="primary"
                    style={{
                        zIndex: 2,
                    }}
                />
            </Backdrop>
        </>
    }

    handleFirstInstallationFormSubmit = async (evt: SyntheticEvent) => {
        evt.preventDefault();
        const { newInstallationId, user, userInstallationsCount } = this.state;
        const installationId = Number.parseInt(newInstallationId);
        if (user && typeof installationId === 'number' && !isNaN(installationId)) {
            try {
                const getInstalltionInfo = firebaseApp
                    .functions()
                    .httpsCallable('getInstalltionInfo');
                const resp = await getInstalltionInfo({ installationId });
                if (resp.data.error) {
                    throw resp.data.reason || "Unknown error.";
                }
                const { info }: { info: Installation } = resp.data;
                if (info) {
                    const result = await addUserInstallation(user.uid, installationId);
                    if (result) {
                        this.setState({
                            newInstallationId: "",
                            userInstallationsCount: userInstallationsCount + 1,
                        })
                    }
                }
            } catch (err) {
                console.error(err);
            }
        }
    }

    getStepContent = () => {
        const { activeStep, newInstallationId } = this.state;
        switch (activeStep) {
            case 0:
                return <>
                    <Typography>Please sing in using your google account to keep track of your Airly installations.</Typography>
                    <Typography style={{ textAlign: "center" }}>
                        <SignInWithGoogleButton />
                    </Typography>
                </>
                break;

            case 1:
                return <>
                    <Typography>Please submit an id of installation you want to keep tracking.</Typography>
                    <form onSubmit={this.handleFirstInstallationFormSubmit} style={{ marginTop: 10 }}>
                        <Box style={{ margin: 10 }}>
                            <TextField
                                required
                                variant="outlined"
                                placeholder="Installation ID"
                                label="Installation ID"
                                value={newInstallationId}
                                onChange={
                                    evt => this.setState({
                                        newInstallationId: evt.target.value,
                                    })
                                }
                            />
                        </Box>
                        <Box style={{ margin: 10 }}>
                            <Button
                                type="submit"
                                variant="contained"
                                size="large"
                                color="primary"
                            >
                                Submit
                                        </Button>
                        </Box>
                    </form>
                </>
                break;

            default:
                return <>
                </>
                break;
        }
    }

}