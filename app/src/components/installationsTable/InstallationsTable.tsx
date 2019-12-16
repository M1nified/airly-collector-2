import React, { Component } from "react";
import { InstallationFS } from "../../../../shared/src/firestore/InstallationFS";
import firebase from './../../firebase';
import { Paper, Toolbar, TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Checkbox } from "@material-ui/core";
import { Redirect } from "react-router-dom";

type InstallationsTableState = {
    installations: InstallationFS[],
    installationsToShow: InstallationFS[],
    page: number,
    rowsPerPage: number,
    user: firebase.User | null,
    userInstallationRefs: firebase.firestore.DocumentReference[],
    checkedIds: { [installationId: string]: boolean },
    redirectTo?: string,
}

type InstallationsTableProps = {

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
    }

    componentDidMount() {
        const user = firebase.auth().currentUser;

        this.setState({
            user,
        })

        this.loadAllInstallations();

        firebase.auth().onIdTokenChanged(async (user) => {
            this.setState({
                user,
            }, () => {
                this.loadAllInstallations();
            })
        })
    }

    render() {
        if (this.state.redirectTo) {
            return <Redirect to={this.state.redirectTo} />
        }
        const rows = this.state.installationsToShow.map((installation, idx) => {
            const isItemSelected = !!this.state.checkedIds[installation.installationId];
            return (
                <TableRow
                    key={idx}
                    hover={true}
                    selected={isItemSelected}
                >
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
                    <TableCell
                        onClick={() => this.handleCellClick(installation)}
                    >
                        {installation.info?.id}
                    </TableCell>
                    <TableCell
                        onClick={() => this.handleCellClick(installation)}
                    >
                        {installation.info?.address.city}, {installation.info?.address.street}&nbsp;{installation.info?.address.number}
                    </TableCell>
                </TableRow>
            )
        });
        return <>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    onChange={(evt) => {
                                        if (evt.target.checked) {
                                            const checkedIds: any = {};
                                            this.state.installationsToShow.forEach(({ installationId }) => {
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
                            <TableCell>Id</TableCell>
                            <TableCell>Address</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    }

    handleCellClick = (installation: InstallationFS) => {
        console.log(installation)
        this.setState({
            redirectTo: `/browse/${installation.installationId}`,
        })
    }


    loadAllInstallations = async () => {
        const { user } = this.state;
        if (!user)
            return;

        const userFS = (await firebase.firestore()
            .doc(`users/${user.uid}`)
            .get()).data();
        if (!userFS || !Array.isArray(userFS.installations)) {
            return;
        }
        const { installations: installationRefs } = userFS as { installations: firebase.firestore.DocumentReference[] };
        const installations = await (async (installationsRaw) => {
            const installations = installationsRaw.filter(x => x) as InstallationFS[];
            return installations;
        })(
            await Promise.all(installationRefs
                .map(ref => ref.get()
                    .then(x => x.data()))
            )
        )
        this.setState({
            installations
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