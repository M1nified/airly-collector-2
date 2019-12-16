import Airly from 'airly';
import * as functions from 'firebase-functions';
import { AirlySettingsFS } from '../../shared/lib/firestore/AirlySettingsFS';
import { InstallationFS } from '../../shared/lib/firestore/InstallationFS';
import { Measurements } from '../../shared/src/models/AirlyApiModels';
import admin = require('firebase-admin');

// // Start writing Firebase Functions
// // https://firebase.google.com/docs/functions/typescript
//
// export const helloWorld = functions.https.onRequest((request, response) => {
//  response.send('Hello from Firebase!');
// });

const app = admin.initializeApp();

export const updateMeasurements = functions
    .region('europe-west2')
    .pubsub
    .schedule('0 * * * *')
    .onRun(async (context) => {
        console.log('start');
        const now = new Date();
        const zeroDate = new Date(Date.now() - 43200000); // every 12 hours
        const [installationsToUpdateQS1, installationsToUpdateQS2] = await Promise.all([
            admin.firestore()
                .collection('installations')
                .where('lastMeasurementsUpdateDate', '<', zeroDate)
                .get(),
            admin.firestore()
                .collection('installations')
                .where('lastMeasurementsUpdateDate', '==', null)
                .get()
        ])
        if (installationsToUpdateQS1.empty && installationsToUpdateQS2.empty) {
            console.log('Nothing to update.')
            return;
        }
        const docs = [...installationsToUpdateQS1.docs, ...installationsToUpdateQS2.docs];
        console.log(`Trying to update ${docs.length} installations.`)
        const ids = docs.map(installation => (installation.data() as InstallationFS).installationId);
        const measurements = await getMeasurements(...ids);
        if (!measurements) {
            console.error('Failed to get measurements.')
            return {
                error: true,
                reason: 'Failed to get measurements.'
            };
        }
        await Promise.all(
            measurements.map(async (m, idx) => {
                const { ref } = docs[idx];
                return setMeasurements(ref, m, now);
            })
        )
        console.log('finish');
        return;
    })

export const initInstallation = functions
    .region('europe-west2')
    .firestore
    .document('installations/{installationId}')
    .onCreate(async (snapshot, context) => {
        console.log('start');
        if (!snapshot.exists)
            return;
        const { installationId } = snapshot.data() as InstallationFS;
        console.log(installationId);
        const measurements = await getMeasurements(installationId);
        if (measurements && measurements[0] && measurements[0].history) {
            await setMeasurements(snapshot.ref, measurements[0]);
        }
        await setInstallationInfo(installationId);
        console.log('end')
    })

export const onUserWriteCreateInstallations = functions
    .region('europe-west2')
    .firestore
    .document('users/{userId}')
    .onWrite(async (change, context) => {
        console.log('start');
        try {
            const data = change.after.data();
            if (change.after.exists && data && Array.isArray(data.installations)) {
                console.log(`${data.installations.length} installations to check.`)
                await Promise.all(
                    data.installations.map(async (ref: FirebaseFirestore.DocumentReference) => {
                        const doc = await ref.get();
                        if (!doc.exists) {
                            await doc.ref.set({
                                installationId: Number.parseInt(doc.id),
                            })
                        }
                    })
                )
            }
        } catch (err) {
            console.error(err);
        }
        console.log('end');
    })

export const getInstalltionInfo = functions
    .region('europe-west2')
    .https
    .onCall(async (data, context) => {
        console.log('start', data, context);
        const { installationId } = data;
        if (!installationId) {
            return {
                error: true,
                reason: 'No installationId parameter provided.'
            };
        }

        const installationDS = await admin.firestore()
            .collection('installations')
            .doc(installationId)
            .get();
        if (installationDS.exists) {
            const { info } = installationDS.data() as InstallationFS || {};
            if (info) {
                return info;
            }
        }

        const info = await setInstallationInfo(installationId);

        console.log('end', info)
        return info;
    })

const setInstallationInfo = async (installationId: number) => {
    console.log('start', installationId, typeof installationId)
    const airlyApiKey = await getAirlyApiKey();
    if (!airlyApiKey) {
        console.error({
            error: true,
            reason: 'Failed to obtain an Airly API Key.'
        })
        return {
            error: true,
            reason: 'Failed to obtain an Airly API Key.'
        };
    }
    const airly = new Airly(airlyApiKey);
    const info = await airly.installationInfo(installationId)
    const installationDS = await admin.firestore()
        .collection('installations')
        .doc(installationId.toString())
        .get();
    if (!installationDS.exists) {
        await installationDS.ref
            .set({
                installationId,
                info,
                infoUpdatedTime: new Date(),
            })
    } else {
        await installationDS.ref
            .update({
                info,
                infoUpdatedTime: new Date(),
            })
    }
    console.log('end')
    return info;
}

const setMeasurements = async (installationRef: FirebaseFirestore.DocumentReference, measurements: Measurements, pullDate?: Date) => {
    if (measurements.history) {
        await Promise.all(measurements.history.map(
            m => installationRef
                .collection('history')
                .doc(`${m.fromDateTime}|${m.tillDateTime}`)
                .set(m)
        ))
        await installationRef.update({
            lastMeasurementsUpdateDate: pullDate || new Date(),
        } as InstallationFS)
    }
}

const getAirlyApiKey = async () => {
    try {
        console.log('getAirlyApiKey start');
        const qs = await admin
            .firestore(app)
            .collection('settings')
            .get();
        const { airlyApiKey } = qs.docs[0].data() as AirlySettingsFS;
        console.log('getAirlyApiKey apiKey:', airlyApiKey);
        return airlyApiKey;
    } catch (err) {
        console.error('getAirlyApiKey', err);
        return;
    }
}

const getMeasurements = async (...installationId: number[]) => {
    try {
        console.log('getMeasurements start')
        const airlyApiKey = await getAirlyApiKey();
        if (!airlyApiKey)
            throw {
                error: 'Failed to obtain an Airly API Key.'
            };
        const airly = new Airly(airlyApiKey);
        if (installationId.length === 0) {
            return;
        } else {
            const measurements = await Promise.all(
                installationId.map(id => airly.installationMeasurements(id))
            ) as Measurements[]
            return measurements;
        }
    } catch (err) {
        console.error('getMeasurements', err);
        console.error('getMeasurements', { installationId });
        return;
    }
}
