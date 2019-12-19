import firebaseApp from './firebase';

export const addUserInstallation = async (userId: string, installationId: number) => {
    const userRef = firebaseApp.firestore()
        .collection('users')
        .doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        return {
            error: true,
            code: 0,
            reason: "No such user."
        };
    }
    const data = userDoc.data() as { installations?: firebase.firestore.DocumentReference[] };
    const installations = data.installations || [];
    const newInstallationRef = firebaseApp.firestore()
        .collection('installations')
        .doc(installationId.toString());
    if (installations.some(x => newInstallationRef.isEqual(x))) {
        return {
            error: true,
            code: 1,
            reason: "Installation already added to user."
        };
    }
    const newInstallations = [...installations, newInstallationRef];
    await userRef.update({
        installations: newInstallations,
    });
    return {
        success: true,
        installations: newInstallations,
    };

}