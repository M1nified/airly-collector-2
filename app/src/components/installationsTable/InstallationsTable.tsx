import { BottomNavigation, BottomNavigationAction, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, Paper, SvgIcon, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField } from "@material-ui/core";
import { mdiCheck, mdiDelete, mdiPlus } from "@mdi/js";
import React, { Component, FormEvent } from "react";
import { Redirect } from "react-router-dom";
import { InstallationFS } from "../../../../shared/src/firestore/InstallationFS";
import firebaseApp from '../../firebase/firebase';
import { addUserInstallation } from "../../firebase/users";

type InstallationsTableState = {
    installations: InstallationFS[],
    installationsToShow: InstallationFS[],
    page: number,
    rowsPerPage: number,
    user: firebaseApp.User | null,
    userInstallationRefs: firebaseApp.firestore.DocumentReference[],
    checkedIds: { [installationId: string]: boolean },
    redirectTo?: string,
    addInstallationDialogOpen: boolean,
    newInstallationId: number | null,
}

type InstallationsTableProps = {
    editMode: boolean,
    onEditModeOff(): any,
}

export class InstallationsTable extends Component<Readonly<InstallationsTableProps>, InstallationsTableState>{


    state: InstallationsTableState = {
        installations: [],
        installationsToShow: [],
        page: 0,
        rowsPerPage: 5,
        user: null,
        userInstallationRefs: [],
        checkedIds: {},
        addInstallationDialogOpen: false,
        newInstallationId: null,
    }

    componentDidMount() {
        const user = firebaseApp.auth().currentUser;

        this.setState({
            user,
        })

        this.loadAllInstallations();

        firebaseApp.auth().onIdTokenChanged(async (user) => {
            this.setState({
                user,
            }, () => {
                this.loadAllInstallations();
            })
        })
    }

    render() {
        const { redirectTo, installationsToShow, checkedIds } = this.state;
        const { editMode } = this.props;
        if (redirectTo) {
            return <Redirect to={redirectTo} />
        }
        const rows = installationsToShow.map((installation, idx) => {
            const isItemSelected = !!this.state.checkedIds[installation.installationId];
            return (
                <TableRow
                    key={idx}
                    hover={true}
                    selected={isItemSelected}
                >
                    {
                        editMode &&
                        <TableCell padding="checkbox">
                            <Checkbox
                                checked={isItemSelected}
                                // inputProps={{ 'aria-labelledby': labelId }}
                                onChange={() => this.setState(
                                    state => ({
                                        checkedIds:
                                            { ...state.checkedIds, [installation.installationId]: !isItemSelected }
                                    })
                                )}
                            />
                        </TableCell>
                    }
                    <TableCell
                        onClick={() => this.handleCellClick(installation)}
                        style={{ cursor: 'pointer' }}
                    >
                        {installation.installationId}
                    </TableCell>
                    <TableCell
                        onClick={() => this.handleCellClick(installation)}
                        style={{ cursor: 'pointer' }}
                    >
                        {installation.info?.address?.city}, {installation.info?.address?.street}&nbsp;{installation.info?.address?.number}
                    </TableCell>
                </TableRow>
            )
        });
        return <>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            {
                                editMode &&
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        onChange={(evt) => {
                                            if (evt.target.checked) {
                                                const checkedIds: any = {};
                                                this.state.installationsToShow
                                                    .forEach(({ installationId }) => {
                                                        checkedIds[installationId] = true;
                                                    });
                                                this.setState({
                                                    checkedIds,
                                                })
                                            } else {
                                                this.setState({
                                                    checkedIds: {},
                                                })
                                            }
                                        }}
                                    />
                                </TableCell>
                            }
                            <TableCell>Id</TableCell>
                            <TableCell>Address</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows}
                    </TableBody>
                </Table>
            </TableContainer>
            <Drawer
                anchor="bottom"
                open={this.props.editMode}
                variant="persistent"
            >
                <BottomNavigation
                    showLabels
                >
                    <BottomNavigationAction
                        label="Add"
                        onClick={this.handleAddInstallationButtonClick}
                        icon={<SvgIcon><path d={mdiPlus} /></SvgIcon>}
                    />
                    <BottomNavigationAction
                        label="Delete"
                        onClick={this.handleDeleteButtonClick}
                        icon={<SvgIcon><path d={mdiDelete} /></SvgIcon>}
                        disabled={!Object.values(checkedIds).some(ci => ci)}
                    />
                    <BottomNavigationAction
                        label="Done"
                        onClick={() => this.props.onEditModeOff()}
                        icon={<SvgIcon><path d={mdiCheck} /></SvgIcon>}
                    />
                </BottomNavigation>
            </Drawer>
            <Dialog
                open={this.state.addInstallationDialogOpen}
                onClose={() => this.setState({ addInstallationDialogOpen: false, })}
            >
                <DialogTitle>Add new installation.</DialogTitle>
                <form onSubmit={this.handleAddInstallationFormSubmit}>
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
                            type="submit"
                        >
                            Submit
                    </Button>
                    </DialogActions>
                </form>
            </Dialog>
        </>
    }

    handleCellClick = (installation: InstallationFS) => {
        console.log(installation)
        const { editMode } = this.props;
        if (!editMode) {
            this.setState({
                redirectTo: `/installation/${installation.installationId}`,
            })
        }
    }

    handleAddInstallationButtonClick = async () => {
        this.setState({
            addInstallationDialogOpen: true,
        })
    }

    handleDeleteButtonClick = async () => {
        const { checkedIds } = this.state;
        const user = firebaseApp.auth().currentUser;

        if (!user) return;
        const idsToRemove = Object.keys(checkedIds).filter(id => checkedIds[id]);
        try {
            const data = await firebaseApp.firestore()
                .collection('users')
                .doc(user.uid)
                .get()
                .then(x => x.data())
            if (Array.isArray(data?.installations)) {
                const installations = (data?.installations as firebaseApp.firestore.DocumentReference[])
                    .filter(ref => !idsToRemove.some(id => id === ref.id))
                await firebaseApp.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .update({
                        installations,
                    })
                await this.loadAllInstallations();
            }
        } catch (err) {
            console.error(err);
        }
    }

    handleAddInstallationFormSubmit = async (evt: FormEvent) => {
        console.log('submit')
        evt.preventDefault();
        await this.addInstallation();
    }

    addInstallation = async () => {
        const { newInstallationId, user } = this.state;
        if (!newInstallationId || !user) {
            return;
        }
        const result = await addUserInstallation(user.uid, newInstallationId);
        if (result.error) {
            console.error(result);
        } else {
            this.setState({
                addInstallationDialogOpen: false,
                newInstallationId: null,
            });
            await firebaseApp.firestore().waitForPendingWrites();
            this.loadAllInstallations();
        }
    }

    loadAllInstallations = async () => {
        const { user } = this.state;
        if (!user)
            return;

        const userFS = (await firebaseApp.firestore()
            .doc(`users/${user.uid}`)
            .get()).data();
        if (!userFS || !Array.isArray(userFS.installations)) {
            return;
        }
        const { installations: installationRefs } = userFS as { installations: firebaseApp.firestore.DocumentReference[] };
        const installations = await (async (installationsRaw) => {
            const installations = installationsRaw.filter(x => x) as InstallationFS[];
            return installations;
        })(
            await Promise.all(
                installationRefs
                    .map(ref => ref.get()
                        .then(x => x.data()))
            )
        )
        this.setState({
            installations,
            userInstallationRefs: installationRefs,
        }, () => {
            this.updateInstallationsToShow();
        });
    }

    updateInstallationsToShow = async () => {
        const { rowsPerPage, page, installations } = this.state;
        const initialIndex = rowsPerPage * page;
        if (initialIndex > installations.length && page > 0) {
            this.setState({
                page: page - 1,
            })
            return;
        }
        const installationsToShow = installations
            .sort((a, b) => (a.installationId - b.installationId))
            .slice(initialIndex, initialIndex + rowsPerPage);
        this.setState({
            installationsToShow,
        });
    }


}