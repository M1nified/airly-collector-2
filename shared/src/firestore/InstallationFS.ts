import { Installation } from "../models/AirlyApiModels";

export type InstallationFS = {
    installationId: number,
    infoUpdatedTime: Date,
    info?: Installation,
    lastMeasurementsUpdateDate: Date,
}