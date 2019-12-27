import { Checkbox, Fab, List, ListItem, ListItemIcon, ListItemText, Paper, SvgIcon, SwipeableDrawer, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Zoom } from "@material-ui/core";
import { mdiCheck, mdiCheckboxBlankCircle, mdiFilterVariant } from "@mdi/js";
import React, { PureComponent } from "react";
import ReactDOM from 'react-dom';
import { useParams } from "react-router-dom";
import { AveragedValues, Index, Standard, Value } from "../../../../shared/src/models/AirlyApiModels";
import TheAppBar from "../../components/theAppBar/TheAppBar";
import firebaseApp from "../../firebase/firebase";

export const dateToDisplay = (date: Date) => {

    return `${date.toLocaleDateString()} ${date.toLocaleTimeString("en-UK", {
        hour12: false,
    })}`;
}

const INDEXES_TO_DISPLAY = [
    { id: 1, name: "AIRLY_CAQI", displayName: <>Airly&nbsp;CAQI</> },
];
const STANDARDS_TO_DISPLAY = [
    { id: 1, name: "WHO", pollutant: "PM25", displayName: <>WHO&nbsp;PM2.5</> },
    { id: 2, name: "WHO", pollutant: "PM10", displayName: <>WHO&nbsp;PM10</> },
];
const VALUES_TO_DISPLAY = [
    { id: 1, name: "PM1", displayName: "PM1" },
    { id: 2, name: "PM25", displayName: "PM2.5" },
    { id: 3, name: "PM10", displayName: "PM10" },
    { id: 4, name: "PRESSURE", displayName: "Pressure" },
    { id: 5, name: "HUMIDITY", displayName: "Humidity" },
    { id: 6, name: "TEMPERATURE", displayName: "Temperature" },
];

const matchPatternToDisplay = (challengers: any[]) => (candidate: any): boolean => challengers
    .some(chal => Object.keys(chal).filter(key => !['displayName', 'id'].includes(key)).every(key => candidate[key] === chal[key]));

const indexesToDisplay = (indexes: Index[]): Index[] => indexes.filter(matchPatternToDisplay(INDEXES_TO_DISPLAY));

const standardsToDisplay = (standards: Standard[]): Standard[] => standards.filter(matchPatternToDisplay(STANDARDS_TO_DISPLAY));

const valuesToDisplay = (values: Value[]): Value[] => values.filter(matchPatternToDisplay(VALUES_TO_DISPLAY));


const LOADING = 1;
const LOADED = 2;

let itemStatusMap: any = {};
let docRefs: firebaseApp.firestore.QueryDocumentSnapshot<firebaseApp.firestore.DocumentData>[] = [];
let historyRecords: AveragedValues[] = [];

type RowProps = {
    index: number,
    style: any,
    columnsToDisplay: ColumnsToDisplay,
}

class Row extends PureComponent<RowProps> {
    render() {
        const { index, style, columnsToDisplay } = this.props;
        let elem, content;
        if (itemStatusMap[index] === LOADED) {
            elem = historyRecords[index];
        }
        if (elem) {
            const { fromDateTime, tillDateTime, indexes, standards, values } = elem;

            const indexesToShow = indexes && indexes.length >= INDEXES_TO_DISPLAY.length
                ? indexesToDisplay(indexes.filter(x =>
                    columnsToDisplay.indexes.some(({ checked, record }) => checked && record.name === x.name)
                ))
                : Array(INDEXES_TO_DISPLAY.length).fill({}) as Index[];

            const colorsToShow = indexes && indexes.length >= INDEXES_TO_DISPLAY.length
                ? indexesToDisplay(indexes)
                : Array(INDEXES_TO_DISPLAY.length).fill({}) as Index[];

            const standardsToShow = standards && standards.length >= STANDARDS_TO_DISPLAY.length
                ? standardsToDisplay(standards.filter(x =>
                    columnsToDisplay.standards.some(({ checked, record }) => checked && record.name === x.name)
                ))
                : Array(STANDARDS_TO_DISPLAY.length).fill({}) as Standard[];

            const valuesToShow = values && values.length >= VALUES_TO_DISPLAY.length
                ? valuesToDisplay(values.filter(x =>
                    columnsToDisplay.values.some(({ checked, record }) => checked && record.name === x.name)
                ))
                : Array(VALUES_TO_DISPLAY.length).fill({}) as Value[];

            const from = fromDateTime && dateToDisplay(new Date(fromDateTime));
            const till = tillDateTime && dateToDisplay(new Date(tillDateTime));

            content = <>
                {
                    columnsToDisplay.colors &&
                    colorsToShow.map((index, key) => {
                        return <TableCell key={key}>
                            <Tooltip title={`${index.name}`}>
                                <SvgIcon
                                    style={{ color: index.color ?? "" }}
                                ><path d={mdiCheckboxBlankCircle} /></SvgIcon>
                            </Tooltip>
                        </TableCell>
                    })
                }
                {
                    columnsToDisplay.from &&
                    <Tooltip title={fromDateTime}>
                        <TableCell>
                            {from}
                        </TableCell>
                    </Tooltip>
                }
                {
                    columnsToDisplay.till &&
                    <Tooltip title={tillDateTime}>
                        <TableCell>
                            {till}
                        </TableCell>
                    </Tooltip>
                }
                {
                    indexesToShow.map((index, key) => {
                        return <Tooltip title={index.level} key={key}>
                            <TableCell>
                                {index.value}
                            </TableCell>
                        </Tooltip>
                    })
                }
                {
                    standardsToShow.map((standard, key) => {
                        return <TableCell key={key}>
                            {standard.percent}%
                        </TableCell>
                    })
                }
                {
                    valuesToShow.map((value, key) => {
                        return <TableCell key={key}>
                            {value.value}
                        </TableCell>
                    })
                }
            </>
        } else {
            content = <TableCell colSpan={3}>
                "Loading..."
            </TableCell>
        }
        return (
            <TableRow style={style}>
                {content}
            </TableRow>
        );
    }
}

type RowsProps = {
    elementsCount: number,
    isItemLoaded(index: number): boolean,
    loadMoreItems(fromIndex: number, tillIndex: number): Promise<any>,
    onRowHeightChange(rowHeight: number): any,
    scrollTop: number,
    columnsToDisplay: ColumnsToDisplay,
}

type RowsState = {
    renderCount: number,
    renderOffset: number,
    iteration: number,
    bodyId: string,
    rowHeight: number,
}

class Rows extends PureComponent<RowsProps, RowsState>{

    state: RowsState = {
        renderCount: 1,
        renderOffset: 0,
        iteration: 0,
        bodyId: Math.floor(Math.random() * 10000000).toString(),
        rowHeight: 1,
    }

    async componentDidMount() {
        const { renderCount, renderOffset } = this.state;

        const { renderCountEnsured, rowHeight } = (() => {

            let div = ReactDOM.findDOMNode(this);
            if (div instanceof Element) {
                const fc = div.children?.[0]?.clientHeight ?? undefined;
                if (fc) {
                    while (div && div.tagName.toLowerCase() !== 'div')
                        div = div.parentElement;
                    if (div) {
                        const count = Math.floor(div.clientHeight / fc);
                        return {
                            renderCountEnsured: count - 1,
                            rowHeight: fc,
                        };
                    }
                }
            }
        })()
            || {
            renderCountEnsured: renderCount,
            rowHeight: 1,
        };

        const [from, till] = [0, renderCountEnsured].map(x => x + renderOffset);
        await this.props.loadMoreItems(from, till);
        this.setState({
            renderCount: renderCountEnsured,
            rowHeight,
        })
        rowHeight && this.props.onRowHeightChange(rowHeight);
        this.incIter();
    }

    async componentDidUpdate(prevProps: RowsProps) {
        if (prevProps.scrollTop !== this.props.scrollTop) {
            const { rowHeight, renderCount } = this.state;
            const { elementsCount, scrollTop } = this.props;
            const floatIdx = scrollTop / rowHeight;
            const renderOffset = (() => {
                const given = Math.floor(floatIdx);
                return Math.min(given, elementsCount - renderCount);
            })();
            const [from, till] = [0, renderCount].map(x => x + renderOffset);
            this.props.loadMoreItems(from, till);
            this.setState({
                renderOffset,
            })
        }
    }

    render() {
        const { renderOffset, renderCount, iteration, bodyId } = this.state;
        const { columnsToDisplay } = this.props;
        return (
            <>
                <TableBody
                    onScroll={this.handleScroll}
                    key={iteration}
                    id={bodyId}
                    style={{}}
                >
                    {
                        Array(renderCount).fill(undefined).map((x, idx) => {
                            const index = idx + renderOffset;
                            return <Row
                                key={index}
                                index={index}
                                style={null}
                                columnsToDisplay={columnsToDisplay}
                            />
                        })
                    }
                </TableBody>
            </>
        )
    }

    handleScroll = (evt: any) => {
    }

    incIter = () => {
        const { iteration } = this.state;
        this.setState({
            iteration: (iteration + 1) % 1000,
        })
    }
}

type ColumnsToDisplay = {
    indexes: { record: any, checked: boolean }[],
    standards: { record: any, checked: boolean }[],
    values: { record: any, checked: boolean }[],
    from: boolean,
    till: boolean,
    colors: boolean,
};

type InstallationsTableProps = {
    installationId: number,
}
type InstallationsTableState = {
    initComplete: boolean,
    itemCount: number,
    containerOffsetTop: number,
    rowHeight: number,
    scrollTop: number,
    filterDrawerOpen: boolean,
    columnsToDisplay: ColumnsToDisplay,
}

class InstallationsTable extends PureComponent<InstallationsTableProps, InstallationsTableState>{

    state: InstallationsTableState = {
        initComplete: false,
        itemCount: 0,
        containerOffsetTop: 0,
        rowHeight: 1,
        scrollTop: 0,
        filterDrawerOpen: false,
        columnsToDisplay: {
            indexes: INDEXES_TO_DISPLAY.map(x => ({ record: x, checked: true })),
            standards: STANDARDS_TO_DISPLAY.map(x => ({ record: x, checked: true })),
            values: VALUES_TO_DISPLAY.map(x => ({ record: x, checked: true })),
            from: true,
            till: true,
            colors: true,
        },
    }

    unsubAuthStateChanged?: firebaseApp.Unsubscribe;
    unsubHistoryOnSnapshot?: firebaseApp.Unsubscribe;

    async componentDidMount() {

        const thisElem = ReactDOM.findDOMNode(this);
        const containerOffsetTop = thisElem instanceof Element ? (thisElem as HTMLElement).offsetTop : 0;
        this.setState({
            containerOffsetTop,
        });

        const init = async () => {
            const { installationId } = this.props;
            const { currentUser } = firebaseApp.auth();
            if (!currentUser)
                return;
            const qs = await firebaseApp.firestore()
                .doc(`installations/${installationId}`)
                .collection('history')
                .orderBy('fromDateTime', 'desc')
                .get()
            const itemCount = qs.size;
            docRefs = qs.docs;

            const userFS = await firebaseApp.firestore()
                .collection('users')
                .doc(currentUser.uid)
                .get()
                .then(x => x.data());

            if (userFS && userFS.columnsToDisplay) {
                const { columnsToDisplay } = userFS;
                const ctd = {
                    ...columnsToDisplay,
                    indexes: INDEXES_TO_DISPLAY.map(x => ({ record: x, checked: columnsToDisplay.indexes.find((y: any) => y.record?.id === x.id)?.checked ?? true })),
                    standards: STANDARDS_TO_DISPLAY.map(x => ({ record: x, checked: columnsToDisplay.standards.find((y: any) => y.record?.id === x.id)?.checked ?? true })),
                    values: VALUES_TO_DISPLAY.map(x => ({ record: x, checked: columnsToDisplay.values.find((y: any) => y.record?.id === x.id)?.checked ?? true })),
                }
                this.setState({
                    columnsToDisplay: {
                        ...this.state.columnsToDisplay,
                        ...ctd,
                    }
                })
            }

            const initComplete = true;
            this.setState({
                initComplete,
                itemCount,
            })
        }

        this.unsubAuthStateChanged = firebaseApp.auth().onAuthStateChanged(user => {
            if (user && !this.state.initComplete) {
                init();
            } else if (!user) {
                // TODO
            }
        })

    }

    componentWillUnmount() {
        this.unsubAuthStateChanged?.call(this);
        this.unsubHistoryOnSnapshot?.call(this);
    }

    render() {
        const { containerOffsetTop, rowHeight, itemCount, filterDrawerOpen, columnsToDisplay } = this.state;

        const thStyle: React.CSSProperties = {
            position: 'sticky',
            top: '0px',
            background: '#fff',
        }

        return <>
            <TableContainer component={Paper} id="tableRoot"
                style={{
                    height: `calc( 100vh - ${containerOffsetTop}px )`,
                    overflow: 'auto',
                    position: 'relative',
                }}
                onScroll={this.handleScroll}
            >
                <Table style={{
                    position: 'sticky',
                    top: '0px',
                }}>
                    <TableHead>
                        <TableRow>
                            <TableCell style={thStyle}>
                            </TableCell>
                            {
                                columnsToDisplay.from &&
                                <TableCell style={thStyle}>
                                    From
                            </TableCell>
                            }
                            {
                                columnsToDisplay.till &&
                                <TableCell style={thStyle}>
                                    Till
                            </TableCell>
                            }
                            {
                                columnsToDisplay.indexes
                                    .filter(x => x.checked)
                                    .map((index, key) => <TableCell key={key} style={thStyle}>
                                        {index.record.displayName}
                                    </TableCell>)
                            }
                            {
                                columnsToDisplay.standards
                                    .filter(x => x.checked)
                                    .map((standard, key) => <TableCell key={key} style={thStyle}>
                                        {standard.record.displayName}
                                    </TableCell>)
                            }
                            {
                                columnsToDisplay.values
                                    .filter(x => x.checked)
                                    .map((value, key) => <TableCell key={key} style={thStyle}>
                                        {value.record.displayName}
                                    </TableCell>)
                            }
                        </TableRow>
                    </TableHead>
                    {
                        this.state.initComplete &&
                        (
                            <Rows
                                elementsCount={itemCount}
                                isItemLoaded={this.isItemLoaded}
                                loadMoreItems={this.loadMoreItems}
                                onRowHeightChange={this.handleRowHeightChange}
                                scrollTop={this.state.scrollTop}
                                columnsToDisplay={columnsToDisplay}
                            />
                        )
                    }
                </Table>
                <div style={{
                    height: `calc( ${rowHeight * (itemCount + 2)}px - 100vh + ${containerOffsetTop}px )`,
                }}>
                    &nbsp;
                </div>
            </TableContainer>
            <Zoom
                in={!filterDrawerOpen}
                style={{
                    position: "fixed",
                    bottom: 10,
                    right: 10,
                }}
            >
                <Fab color="primary" onClick={() => this.setState({ filterDrawerOpen: true })}>
                    <SvgIcon><path d={mdiFilterVariant} /></SvgIcon>
                </Fab>
            </Zoom>
            <Zoom
                in={filterDrawerOpen}
                style={{
                    position: "fixed",
                    bottom: 10,
                    right: 10,
                    zIndex: 2000,
                }}
            >
                <Fab color="primary" onClick={this.handleFilterDrawerClose}>
                    <SvgIcon><path d={mdiCheck} /></SvgIcon>
                </Fab>
            </Zoom>
            <SwipeableDrawer
                open={filterDrawerOpen}
                anchor="bottom"
                onOpen={() => this.setState({ filterDrawerOpen: true })}
                onClose={this.handleFilterDrawerClose}
            >
                <>
                    <List>
                        <ListItem>
                            <ListItemIcon>
                                <Checkbox
                                    edge="start"
                                    checked={columnsToDisplay.from}
                                    onChange={(evt => {
                                        const checked = evt.target.checked;
                                        const ctd = { ...columnsToDisplay };
                                        ctd.from = checked;
                                        this.setState({
                                            columnsToDisplay: ctd,
                                        });
                                    })}
                                />
                            </ListItemIcon>
                            <ListItemText>
                                From
                                </ListItemText>
                        </ListItem>
                        <ListItem>
                            <ListItemIcon>
                                <Checkbox
                                    edge="start"
                                    checked={columnsToDisplay.till}
                                    onChange={(evt => {
                                        const checked = evt.target.checked;
                                        const ctd = { ...columnsToDisplay };
                                        ctd.till = checked;
                                        this.setState({
                                            columnsToDisplay: ctd,
                                        });
                                    })}
                                />
                            </ListItemIcon>
                            <ListItemText>
                                Till
                                </ListItemText>
                        </ListItem>
                        {
                            columnsToDisplay.indexes.map((itd, key) => <ListItem key={key}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={itd.checked}
                                        onChange={(evt => {
                                            const checked = evt.target.checked;
                                            const ctd = { ...columnsToDisplay };
                                            ctd.indexes = columnsToDisplay.indexes.map(x => x.record === itd.record ? { ...x, checked } : x);
                                            this.setState({
                                                columnsToDisplay: ctd,
                                            });
                                        })}
                                    />
                                </ListItemIcon>
                                <ListItemText>
                                    {itd.record.displayName}
                                </ListItemText>
                            </ListItem>)
                        }
                        {

                            columnsToDisplay.standards.map((itd, key) => <ListItem key={key}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={itd.checked}
                                        onChange={(evt => {
                                            const checked = evt.target.checked;
                                            const ctd = { ...columnsToDisplay };
                                            ctd.standards = columnsToDisplay.standards.map(x => x.record === itd.record ? { ...x, checked } : x);
                                            this.setState({
                                                columnsToDisplay: ctd,
                                            });
                                        })}
                                    />
                                </ListItemIcon>
                                <ListItemText>
                                    {itd.record.displayName}
                                </ListItemText>
                            </ListItem>)
                        }
                        {

                            columnsToDisplay.values.map((itd, key) => <ListItem key={key}>
                                <ListItemIcon>
                                    <Checkbox
                                        edge="start"
                                        checked={itd.checked}
                                        onChange={(evt => {
                                            const checked = evt.target.checked;
                                            const ctd = { ...columnsToDisplay };
                                            ctd.values = columnsToDisplay.values.map(x => x.record === itd.record ? { ...x, checked } : x);
                                            this.setState({
                                                columnsToDisplay: ctd,
                                            });
                                        })}
                                    />
                                </ListItemIcon>
                                <ListItemText>
                                    {itd.record.displayName}
                                </ListItemText>
                            </ListItem>)
                        }
                    </List>
                </>
            </SwipeableDrawer>
        </>
    }

    handleFilterDrawerClose = () => {
        this.setState({ filterDrawerOpen: false });
        const user = firebaseApp.auth().currentUser;
        if (user) {
            const { columnsToDisplay: ctd } = this.state;
            const columnsToDisplay = {
                ...ctd,
                indexes: ctd.indexes.map(x => ({ ...x, record: { id: x.record.id } })),
                standards: ctd.standards.map(x => ({ ...x, record: { id: x.record.id } })),
                values: ctd.values.map(x => ({ ...x, record: { id: x.record.id } })),
            }

            try {
                firebaseApp.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .update({
                        columnsToDisplay,
                    });
            } catch (err) {
                console.error(err);
            }
        }
    }

    handleScroll = (evt: React.UIEvent) => {
        const top = (evt?.nativeEvent?.target as any)?.scrollTop;
        if (typeof top === 'number') {
            this.setState({
                scrollTop: top,
            })
        }
    }

    handleRowHeightChange = (rowHeight: number) => {
        this.setState({
            rowHeight,
        })
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
                    return null;
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
            <TheAppBar
                goBackTo="/"
            />
            <InstallationsTable
                installationId={installationId}
            />
        </>
    );
}