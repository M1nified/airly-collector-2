import firebaseApp from './firebase';

export const addUserInstallation = async (userId: string, installationId: number) => {
    const userRef = firebaseApp.firestore()
        .collection('users')
        .doc(userId);
    const installationRef = firebaseApp.firestore()
        .collection('installations')
        .doc(installationId.toString())
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        const installations = [installationRef];
        await userRef.set({
            installations,
        });
        return {
            success: true,
            installations,
        };
    } else {
        const data = userDoc.data() as { installations?: firebase.firestore.DocumentReference[] };
        console.log(data)
        const installations = data.installations || [];
        if (installations.some(x => installationRef.isEqual(x))) {
            return {
                error: true,
                code: 1,
                reason: "Installation already added to user."
            };
        }
        const newInstallations = [...installations, installationRef];
        await userRef.update({
            installations: newInstallations,
        });
        return {
            success: true,
            installations: newInstallations,
        };
    }

}