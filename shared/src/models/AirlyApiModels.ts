export type Installation = {
    id: number, // ID of the installation,
    location: Coordinates, // Location,
    address: Address, // Address,
    elevation: number, // Elevation,
    airly: boolean, // Indicates if this is Airly sensor,
    sponsor: Sponsor, // Sponsor
}
export type Coordinates = {
    latitude: number,
    longitude: number
}
export type Address = {
    country?: string,
    city?: string,
    street?: string,
    number?: string,
    displayAddress1?: string,
    displayAddress2?: string,
}
export type Sponsor = {
    id: number,
    name: string,
    description?: string,
    logo: string,
    link?: string,
}

export type Measurements = {
    current?: AveragedValues,
    history?: AveragedValues[],
    forecast?: AveragedValues[],
}

export type AveragedValues = {
    fromDateTime?: string, // Left bound of the time period over which average measurements were calculated, inclusive, always UTC,
    tillDateTime?: string, // Right bound of the time period over which average measurements were calculated, exclusive, always UTC,
    values?: Value[], // List of raw measurements, averaged over specified period. Measurement types available in this list depend on the capabilities of the queried installation, e.g. particulate matter (PM1, PM25, PM10), gases (CO, NO2, SO2, O3) or weather conditions (temperature, humidity, pressure),
    indexes?: Index[], // List of indexes calculated from the values available. Indexes are defined by relevant national and international institutions, e.g. EU, GIOŚ or US EPA,
    standards?: Standard[], // List of 'standard' values, or 'limits' for pollutants that should not be exceeded over certain period of time. Limits are defined by relevant national and international institutions, like e.g. WHO or EPA. For each standard limit in this list there is also a corresponding measurement expressed as a percent value of the limit
}

export type Value = {
    name?: string, // Name of this measurement,
    value?: number, // Value of this measurement
}

export type Index = {
    name?: string, // Name of this index,
    value?: number, // Index numerical value,
    level?: string, // Index level name,
    description?: string, // Text describing this air quality level. Text translation is returned according to language specified in the request (English being default),
    advice?: string, // Piece of advice from Airly regarding air quality. Text translation is returned according to language specified in the request (English being default),
    color?: string, // Color representing this index level, given by hexadecimal css-style triplet
}

export type Standard = {
    name?: string, // Name of this standard,
    pollutant?: string, // Pollutant described by this standard,
    limit?: number, // Limit value of the pollutant,
    percent?: number, // Pollutant measurement as percent of allowable limit
}

export type IndexType = {
    name?: string, // Name of this index,
    levels?: IndexLevel[], // List of possible index levels
}

export type IndexLevel = {
    minValue?: number, // Minimum index value for this level,
    maxValue?: number, // Maximum index value for this level,
    values?: string, // Values range for this index level,
    level?: string, // Name of this index level,
    description?: string, // Text describing this index level,
    color?: string, // Color representing this index level, given by hexadecimal css-style triplet
}

export type MeasurementType = {
    name?: string, // Identifier of this measurement type. Also used as 'name' identifier in 'measurements' API,
    label?: string, // Short name of this measurement type. This is a translated field and will contain value according to Access-Language header,
    unit?: string, // Unit of this measurement type
}