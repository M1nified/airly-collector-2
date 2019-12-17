import { Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Icon, SvgIcon, Grid, GridList, Tooltip } from "@material-ui/core";
import React, { PureComponent } from "react";
import ReactDOM from 'react-dom';
import { useParams } from "react-router-dom";
import { AveragedValues, Index, Standard, Value } from "../../../../shared/src/models/AirlyApiModels";
import TheAppBar from "../../components/theAppBar/TheAppBar";
import firebase from "./../../firebase";
import { mdiCheckboxBlankCircle } from "@mdi/js";

const INDEXES_TO_DISPLAY = [
    { name: "AIRLY_CAQI" },
];
const STANDARDS_TO_DISPLAY = [
    { name: "WHO", pollutant: "PM25" },
    { name: "WHO", pollutant: "PM10" },
];
const VALUES_TO_DISPLAY = [
    { name: "PM1" },
    { name: "PM25" },
    { name: "PM10" },
    { name: "PRESSURE" },
    { name: "HUMIDITY" },
    { name: "TEMPERATURE" },
];

const matchPatternToDisplay = (challengers: any[]) => (candidate: any): boolean => challengers.some(chal => Object.keys(chal).every(key => candidate[key] === chal[key]));

const indexesToDisplay = (indexes: Index[]): Index[] => indexes.filter(matchPatternToDisplay(INDEXES_TO_DISPLAY));

const standardsToDisplay = (standards: Standard[]): Standard[] => standards.filter(matchPatternToDisplay(STANDARDS_TO_DISPLAY));

const valuesToDisplay = (values: Value[]): Value[] => values.filter(matchPatternToDisplay(VALUES_TO_DISPLAY));


const LOADING = 1;
const LOADED = 2;

let itemStatusMap: any = {};
let docRefs: firebase.firestore.QueryDocumentSnapshot<firebase.firestore.DocumentData>[] = [];
let historyRecords: AveragedValues[] = [];

type RowProps = {
    index: number,
    style: any,
}

class Row extends PureComponent<RowProps> {
    render() {
        const { index, style } = this.props;
        let elem, content;
        if (itemStatusMap[index] === LOADED) {
            elem = historyRecords[index];
        }
        if (elem) {

            const indexes = elem.indexes && elem.indexes.length >= INDEXES_TO_DISPLAY.length
                ? indexesToDisplay(elem.indexes)
                : Array(INDEXES_TO_DISPLAY.length).fill({}) as Index[];

            const standards = elem.standards && elem.standards.length >= STANDARDS_TO_DISPLAY.length
                ? standardsToDisplay(elem.standards)
                : Array(STANDARDS_TO_DISPLAY.length).fill({}) as Standard[];
            console.log(standards)

            const values = elem.values && elem.values.length >= VALUES_TO_DISPLAY.length
                ? valuesToDisplay(elem.values)
                : Array(VALUES_TO_DISPLAY.length).fill({}) as Value[];

            content = <>
                {
                    indexes.map((index, key) => {
                        return <TableCell key={key}>
                            <Tooltip title={`${index.name}`}>
                                <SvgIcon
                                    style={{ color: index.color ?? "" }}
                                ><path d={mdiCheckboxBlankCircle} /></SvgIcon>
                            </Tooltip>
                        </TableCell>
                    })
                }
                <TableCell>
                    {elem.fromDateTime}
                </TableCell>
                <TableCell>
                    {elem.tillDateTime}
                </TableCell>
                {
                    indexes.map((index, key) => {
                        return <Tooltip title={index.level}>
                            <TableCell key={key}>
                                {index.value}
                            </TableCell>
                        </Tooltip>
                    })
                }
                {
                    standards.map((standard, key) => {
                        return <TableCell key={key}>
                            {standard.percent}/{standard.limit}
                        </TableCell>
                    })
                }
                {
                    values.map((value, key) => {
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
            // this.props.onTableTopChange(rowHeight * (floatIdx - Math.floor(floatIdx)))
            const [from, till] = [0, renderCount].map(x => x + renderOffset);
            this.props.loadMoreItems(from, till);
            this.setState({
                renderOffset,
            })
        }
    }

    render() {
        const { renderOffset, renderCount, iteration, bodyId } = this.state;
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
                            return <Row key={index} index={index} style={null} />
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

type InstallationsTableProps = {
    installationId: number,
}
type InstallationsTableState = {
    initComplete: boolean,
    itemCount: number,
    containerOffsetTop: number,
    rowHeight: number,
    scrollTop: number,
}

class InstallationsTable extends PureComponent<InstallationsTableProps, InstallationsTableState>{

    state: InstallationsTableState = {
        initComplete: false,
        itemCount: 0,
        containerOffsetTop: 0,
        rowHeight: 1,
        scrollTop: 0,
    }

    unsubAuthStateChanged?: firebase.Unsubscribe;
    unsubHistoryOnSnapshot?: firebase.Unsubscribe;

    async componentDidMount() {

        const thisElem = ReactDOM.findDOMNode(this);
        const containerOffsetTop = thisElem instanceof Element ? (thisElem as HTMLElement).offsetTop : 0;
        this.setState({
            containerOffsetTop,
        });

        const init = async () => {
            const { installationId } = this.props;
            const qs = await firebase.firestore()
                .doc(`installations/${installationId}`)
                .collection('history')
                .orderBy('fromDateTime', 'desc')
                .get()
            const itemCount = qs.size;
            docRefs = qs.docs;
            const initComplete = true;
            this.setState({
                initComplete,
                itemCount,
            })
            // this.unsubHistoryOnSnapshot = firebase.firestore()
            //     .doc(`installations/${installationId}`)
            //     .collection('history')
            //     .onSnapshot({
            //         next: (snap) => {
            //             console.log(snap)
            //             init();
            //         },
            //         error: (err) => {

            //         }
            //     })
        }

        const user = firebase.auth().currentUser;

        if (user) {
            await init();
        } else {
            this.unsubAuthStateChanged = firebase.auth().onAuthStateChanged(user => {
                if (user && !this.state.initComplete) {
                    init();
                } else if (!user) {
                    // TODO
                }
            })
        }

    }

    componentWillUnmount() {
        this.unsubAuthStateChanged?.call(this);
        this.unsubHistoryOnSnapshot?.call(this);
    }

    render() {
        const { containerOffsetTop, rowHeight, itemCount } = this.state;

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
                            <TableCell style={thStyle}>
                                From
                            </TableCell>
                            <TableCell style={thStyle}>
                                Till
                            </TableCell>
                            {
                                INDEXES_TO_DISPLAY.map((index, key) => <TableCell key={key}>
                                    {index.name}
                                </TableCell>)
                            }
                            {
                                STANDARDS_TO_DISPLAY.map((standard, key) => <TableCell key={key}>
                                    {standard.pollutant}
                                </TableCell>)
                            }
                            {
                                VALUES_TO_DISPLAY.map((value, key) => <TableCell key={key}>
                                    {value.name}
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
        </>
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
                goBackTo="/browse"
            />
            <InstallationsTable
                installationId={installationId}
            />
        </>
    );
}