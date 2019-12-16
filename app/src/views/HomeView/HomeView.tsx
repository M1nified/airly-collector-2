import React, { Component } from "react";
import firebase from "./../../firebase";
import TheAppBar from '../../components/theAppBar/TheAppBar'
import { InstallationFS } from './../../../../shared/lib/firestore/InstallationFS'
import { firestore } from "firebase";
import { Fab, SvgIcon, Tooltip, Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from "@material-ui/core";
import { mdiPlus } from "@mdi/js";
import { InstallationsTable } from "../../components/installationsTable/InstallationsTable";

type HomeViewState = {
    user: firebase.User | null,
    installations: InstallationFS[],
    storedUser?: {
        installations?: firebase.firestore.DocumentReference[],
    },
    addInstallationDialogOpen: boolean,
    newInstallationId: number | null,
}

type HomeViewProps = {

}

export class HomeView extends Component<HomeViewProps, HomeViewState>{

    state: HomeViewState = {
        user: null,
        installations: [],
        addInstallationDialogOpen: false,
        newInstallationId: null,
    }

    async componentDidMount() {
        const user = firebase.auth().currentUser;

        this.updateStateUser();

        this.setState({
            user,
        })

        firebase.auth().onIdTokenChanged((user) => {
            if (user && (!this.state.user || user.uid !== this.state.user.uid)) {
                this.updateStateUser();
            }
            this.setState({
                user,
            })
        })
    }

    render() {
        return <>
            <TheAppBar />
            <InstallationsTable />
            <Tooltip
                title="Add installation to your list"
            >
                <Fab
                    color="primary"
                    style={{
                        right: "10px",
                        bottom: "10px",
                        position: "fixed",
                    }}
                    onClick={this.handleAddInstallationButtonClick}
                >
                    <SvgIcon><path d={mdiPlus} /></SvgIcon>
                </Fab>
            </Tooltip>
            <Dialog
                open={this.state.addInstallationDialogOpen}
                onClose={() => this.setState({ addInstallationDialogOpen: false, })}
            >
                <DialogTitle>Add new installation.</DialogTitle>
                <DialogContent>
                    <DialogContentText><a href="https://airly.eu/map">https://airly.eu/map</a></DialogContentText>
                    <TextField
                        value={this.state.newInstallationId || ""}
                        label="Installation id"
                        type="number"
                        onChange={(evt) => this.setState({ newInstallationId: Number.parseInt(evt.target.value) })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button
                        onClick={this.handleAddInstallationSubmitButtonClick}
                    >
                        Submit
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    }

    handleAddInstallationButtonClick = async () => {
        this.setState({
            addInstallationDialogOpen: true,
        })
    }

    handleAddInstallationSubmitButtonClick = async () => {
        const { newInstallationId, storedUser, user } = this.state;
        if (!newInstallationId || !storedUser || !user) {
            return;
        }
        console.log('x')
        if (!Array.isArray(storedUser.installations) || !storedUser.installations?.some(inst => inst.id === newInstallationId.toString())) {
            const newInstallationRef = firebase.firestore().collection('installations').doc(newInstallationId.toString());
            const installations = storedUser.installations?.concat(newInstallationRef) || [newInstallationRef];
            await firebase.firestore().collection('users').doc(user.uid).update({
                installations,
            });
            await firebase.firestore().waitForPendingWrites();
            const newInstallation = (await newInstallationRef.get()).data() as InstallationFS;
            if (newInstallation) {
                this.setState({
                    installations: this.state.installations.concat(newInstallation),
                    storedUser: { ...this.state.storedUser, installations }
                });
            } else {
                this.setState({
                    storedUser: { ...this.state.storedUser, installations }
                });
                const unsub = newInstallationRef.onSnapshot(async (doc) => {
                    const data = doc.data();
                    if (doc.exists && data && data.info) {
                        this.updateStateUser();
                        unsub();
                    }
                })
            }
        }
    }

    //

    updateStateUser = async () => {
        const user = firebase.auth().currentUser;
        if (!user)
            return;
        await firebase.firestore().waitForPendingWrites();
        const storedUser = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .get()
            .then(x => x.data())
        if (storedUser) {
            this.setState({
                storedUser,
            })
        }
        if (storedUser && storedUser.installations) {
            console.log(storedUser)
            const installations = (await Promise.all(
                (storedUser.installations as firestore.DocumentReference[])
                    .map(x => x
                        .get()
                        .then(x => x.data())
                    )
            )).filter(x => x) as unknown as InstallationFS[];
            console.log(installations)
            this.setState({
                installations,
            })
        }
        this.setState({
            newInstallationId: null,
            addInstallationDialogOpen: false,
        })
    }

}