import React, { PureComponent } from "react";
import { FixedSizeList } from 'react-window';
import InfiniteLoader from 'react-window-infinite-loader';
import TheAppBar from "../../components/theAppBar/TheAppBar";
import { useParams } from "react-router-dom";
import firebase from "./../../firebase";
import { AveragedValues } from "../../../../shared/src/models/AirlyApiModels";
import { TableRow, TableCell, TableContainer, Paper, Table, TableHead, TableBody } from "@material-ui/core";


const LOADING = 1;
const LOADED = 2;

let initComplete = false;

let itemStatusMap: any = {};
let itemCount = 0;
let docRefs: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>[] = [];
let historyRecords: AveragedValues[] = [];

class Row extends PureComponent<any> {
    render() {
        const { index, style } = this.props;
        console.log(index, 'render')
        let elem, content;
        if (itemStatusMap[index] === LOADED) {
            elem = historyRecords[index];
        }
        if (elem) {
            content = <>
                <TableCell>
                    {index}
                </TableCell>
                <TableCell>
                    {elem?.fromDateTime}
                </TableCell>
                <TableCell>
                    {elem?.tillDateTime}
                </TableCell>
            </>
        } else {
            content = <TableCell>
                "loading..."
            </TableCell>
        }
        return (
            <TableRow style={style}>
                {content}
            </TableRow>
        );
    }
}

type InstallationsTableProps = {
    installationId: number,
}
type InstallationsTableState = {
    initComplete: boolean,
    height: number,
    itemCount: number,
}

class InstallationsTable extends PureComponent<InstallationsTableProps, InstallationsTableState>{

    state: InstallationsTableState = {
        initComplete: false,
        height: 150,
        itemCount: 0,
    }

    async componentDidMount() {

        const init = async () => {
            const { installationId } = this.props;
            const qs = await firebase.firestore()
                .doc(`installations/${installationId}`)
                .collection('history')
                .get()
            itemCount = qs.size;
            docRefs = qs.docs;
            initComplete = true;
            this.setState({
                initComplete,
                itemCount,
            })
            firebase.firestore()
                .doc(`installations/${installationId}`)
                .collection('history')
                .onSnapshot(() => {
                    init();
                })
        }

        const user = firebase.auth().currentUser;

        if (user) {
            await init();
        } else {
            firebase.auth().onAuthStateChanged(user => {
                if (user && !this.state.initComplete) {
                    init();
                } else if (!user) {
                    // TODO
                }
            })
        }


    }

    render() {
        return <>
            <TableContainer component={Paper} id="tableRoot">
                {/* <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                From
                            </TableCell>
                            <TableCell>
                                Till
                            </TableCell>
                        </TableRow>
                    </TableHead> */}

                {
                    this.state.initComplete &&
                    <InfiniteLoader
                        isItemLoaded={this.isItemLoaded}
                        itemCount={this.state.itemCount}
                        loadMoreItems={this.loadMoreItems}

                    >
                        {({ onItemsRendered, ref }) => (
                            <FixedSizeList
                                height={this.state.height}
                                itemCount={this.state.itemCount}
                                itemSize={45}
                                onItemsRendered={onItemsRendered}
                                ref={ref}
                                width="100%"
                            >
                                {Row}
                            </FixedSizeList>
                        )}
                    </InfiniteLoader>
                }
                {/* </Table> */}
            </TableContainer>
        </>
    }

    isItemLoaded = (index: number) => !!itemStatusMap[index];

    loadMoreItems = async (startIndex: number, stopIndex: number) => {
        for (let index = startIndex; index <= stopIndex; index++) {
            itemStatusMap[index] = LOADING;
        }

        const docRefsToPull = docRefs.slice(startIndex, stopIndex + 1);

        return Promise.all(
            docRefsToPull
                .map((docRef, idx) => {
                    const idxReal = startIndex + idx;
                    historyRecords[idxReal] = docRef.data();
                    itemStatusMap[idxReal] = LOADED;
                })
        );
    };

}

export function InstallationView() {
    const { installationId: iId } = useParams();
    if (!iId) {
        return <></>;
    }
    const installationId = Number.parseInt(iId);

    return (
        <>
            <TheAppBar />
            <InstallationsTable
                installationId={installationId}
            />
        </>
    );
}