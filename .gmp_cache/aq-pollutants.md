# Current Air Pollutants and Relative Concentrations

This reference details how to retrieve a list of air pollutants, their relative
concentrations, and additional pollutant information (such as sources and health
effects) currently affecting a specified geographic location using the Air
Quality API `currentConditions:lookup` endpoint.

--------------------------------------------------------------------------------

## Endpoint & Authentication

To request current air quality data, send an HTTP `POST` request to the
`currentConditions:lookup` endpoint.

*   **URL**:
    `https://airquality.googleapis.com/v1/currentConditions:lookup?key=YOUR_API_KEY`
*   **Method**: `POST`
*   **Headers**:
    *   `Content-Type: application/json`
    *   `X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1` (Required for usage
        attribution)

--------------------------------------------------------------------------------

## Request Configuration

By default, a basic request containing only the `location` returns only the
Universal AQI (`indexes`). To receive the `pollutants` array containing
pollutant names, concentrations, and units, you **must** specify
`"POLLUTANT_CONCENTRATION"` (and optionally `"POLLUTANT_ADDITIONAL_INFO"` or
`"DOMINANT_POLLUTANT_CONCENTRATION"`) in the `extraComputations` array of the
JSON request body.

### Key Request Parameters

Field               | Type               | Required                 | Description
:------------------ | :----------------- | :----------------------- | :----------
`location`          | `object`           | **Yes**                  | Contains `latitude` (number) and `longitude` (number) coordinates of the target location.
`extraComputations` | `array of strings` | **Yes** (for pollutants) | Controls additional data returned in the response. Must include `"POLLUTANT_CONCENTRATION"` to retrieve the list of all pollutants and their concentrations.
`universalAqi`      | `boolean`          | No                       | If `true` (default), includes the Universal AQI in the `indexes` array.
`languageCode`      | `string`           | No                       | Language code (e.g., `"en"`) for localized display names and text in the response.

### `extraComputations` Values for Pollutants

*   `"POLLUTANT_CONCENTRATION"`: Returns the concentration value and units for
    all available pollutants affecting the location in the `pollutants` array.
*   `"DOMINANT_POLLUTANT_CONCENTRATION"`: Returns the concentration of the
    dominant pollutant only.
*   `"POLLUTANT_ADDITIONAL_INFO"`: Includes the `additionalInfo` object
    (`sources` and `effects`) for each pollutant returned in the `pollutants`
    array.
*   `"LOCAL_AQI"`: Includes local AQI indexes relevant to the specified
    location.
*   `"HEALTH_RECOMMENDATIONS"`: Includes health advice for the general
    population and sensitive groups.

--------------------------------------------------------------------------------

## Code Examples

### cURL Example

```bash
curl -X POST -d '{
  "universalAqi": true,
  "location": {
    "latitude": 37.419734,
    "longitude": -122.0827784
  },
  "extraComputations": [
    "POLLUTANT_CONCENTRATION",
    "POLLUTANT_ADDITIONAL_INFO",
    "DOMINANT_POLLUTANT_CONCENTRATION",
    "LOCAL_AQI"
  ],
  "languageCode": "en"
}' \
-H 'Content-Type: application/json' \
-H 'X-Goog-Maps-Solution-ID: gmp_git_agentskills_v1' \
'https://airquality.googleapis.com/v1/currentConditions:lookup?key=YOUR_API_KEY'
```

### JavaScript (`fetch`) Example

```javascript
async function getCurrentAirPollutants(latitude, longitude, apiKey) {
  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`;

  const requestBody = {
    universalAqi: true,
    location: {
      latitude: latitude,
      longitude: longitude,
    },
    extraComputations: [
      "POLLUTANT_CONCENTRATION",
      "POLLUTANT_ADDITIONAL_INFO"
    ],
    languageCode: "en"
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Maps-Solution-ID': 'gmp_git_agentskills_v1'
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Air Quality API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.pollutants; // Array of pollutant objects with concentrations
}
```

--------------------------------------------------------------------------------

## Response Structure

When `"POLLUTANT_CONCENTRATION"` and `"POLLUTANT_ADDITIONAL_INFO"` are included
in `extraComputations`, the response includes a `pollutants` array alongside the
`dateTime`, `regionCode`, and `indexes` fields.

### Example Response

```json
{
  "dateTime": "2023-06-15T10:00:00Z",
  "regionCode": "us",
  "indexes": [
    {
      "code": "uaqi",
      "displayName": "Universal AQI",
      "aqi": 89,
      "aqiDisplay": "89",
      "color": {
        "red": 48,
        "green": 175,
        "blue": 55,
        "alpha": 255
      },
      "category": "Excellent air quality",
      "dominantPollutant": "o3"
    }
  ],
  "pollutants": [
    {
      "code": "co",
      "displayName": "CO",
      "fullName": "Carbon monoxide",
      "concentration": {
        "value": 334.24,
        "units": "PARTS_PER_BILLION"
      },
      "additionalInfo": {
        "sources": "Typically originates from incomplete combustion...",
        "effects": "When inhaled, carbon monoxide can prevent the blood from..."
      }
    },
    {
      "code": "no2",
      "displayName": "NO2",
      "fullName": "Nitrogen dioxide",
      "concentration": {
        "value": 13.12,
        "units": "PARTS_PER_BILLION"
      },
      "additionalInfo": {
        "sources": "Main sources are fuel burning processes, such as...",
        "effects": "Exposure may cause increased bronchial reactivity..."
      }
    },
    {
      "code": "o3",
      "displayName": "O3",
      "fullName": "Ozone",
      "concentration": {
        "value": 13.88,
        "units": "PARTS_PER_BILLION"
      },
      "additionalInfo": {
        "sources": "Ozone is created in a chemical reaction between atmospheric oxygen...",
        "effects": "Ozone can irritate the airways and cause coughing, a burning..."
      }
    },
    {
      "code": "pm10",
      "displayName": "PM10",
      "fullName": "Inhalable particulate matter (<10µm)",
      "concentration": {
        "value": 5.07,
        "units": "MICROGRAMS_PER_CUBIC_METER"
      },
      "additionalInfo": {
        "sources": "Main sources are combustion processes (e.g. indoor heating, wildfires)...",
        "effects": "Inhalable particles can penetrate into the lungs. Short term exposure..."
      }
    },
    {
      "code": "pm25",
      "displayName": "PM2.5",
      "fullName": "Fine particulate matter (<2.5µm)",
      "concentration": {
        "value": 2.83,
        "units": "MICROGRAMS_PER_CUBIC_METER"
      },
      "additionalInfo": {
        "sources": "Main sources are combustion processes (e.g. power plants, indoor heating...",
        "effects": "Fine particles can penetrate into the lungs and bloodstream. Short term..."
      }
    },
    {
      "code": "so2",
      "displayName": "SO2",
      "fullName": "Sulfur dioxide",
      "concentration": {
        "value": 0.02,
        "units": "PARTS_PER_BILLION"
      },
      "additionalInfo": {
        "sources": "Main sources are burning processes of sulfur-containing fuel in industry...",
        "effects": "Exposure causes irritation of the respiratory tract, coughing and generates..."
      }
    }
  ]
}
```

### Pollutant Object Reference

*   `code`: Unique identifier for the pollutant (e.g., `"co"`, `"no2"`, `"o3"`,
    `"pm10"`, `"pm25"`, `"so2"`). Matches the `dominantPollutant` field in
    `indexes`.
*   `displayName`: Short symbol or name (e.g., `"PM2.5"`, `"NO2"`).
*   `fullName`: Full descriptive name (e.g., `"Fine particulate matter
    (<2.5µm)"`).
*   `concentration.value`: Numeric concentration measurement.
*   `concentration.units`: Measurement unit, such as `"PARTS_PER_BILLION"` or
    `"MICROGRAMS_PER_CUBIC_METER"`.
*   `additionalInfo`: Present only if `"POLLUTANT_ADDITIONAL_INFO"` was
    requested; contains `sources` and `effects` strings.
