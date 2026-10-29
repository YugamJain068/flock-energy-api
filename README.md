# Flock Energy API

This is a REST API developed using **Node.js and Express** and gives users access to electricity meter and distribution transformer data available on the Urja Meter Ops portal. The API gives access to meter information, transformer information, meter location information, and energy consumption readings via an API interface.

## Features

- **Meter APIs:** List meters, meter search, and individual meter information retrieval.
- **Meter location:** Retrieve geographical coordinates of a meter.
- **Energy consumption:** Get the consumption readings via the upstream portal.
- **Transformer APIs:** List transformers (with pagination) and search, transformer information retrieval.
- **Transformer to meter:** Locate meters from a particular transformer using the local meter export.
- **Portal connection:** Connect to the upstream portal via environment variables.
- **Errors:** Validation of input and handling of upstream API errors.

## Tech Stack

- Node.js
- Express.js
- Axios
- `axios-cookiejar-support`
- `tough-cookie`
- dotenv

## Prerequisites

- Node.js and npm
- Access credentials for the Urja Meter Ops portal
- The local meter export file: `data/meter-export.json`

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/YugamJain068/flock-energy-api
cd flock-energy-api
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=3000
PORTAL_EMAIL=your_portal_email
PORTAL_PASSWORD=your_portal_password
```

Keep `.env` out of version control. Use `.env.example` to document the required variables without exposing credentials.

### 4. Add the meter export

Ensure the meter export is available at:

```text
data/meter-export.json
```

The application expects this file to contain a JSON array of meter records, including meter identifiers and transformer mapping information.

### 5. Start the server

Use the start script defined in your `package.json`. If it is configured as `start`, run:

```bash
npm run dev  
```

The API should be available at:

```text
http://localhost:3000
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Meters

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/meters` | Retrieve meter records |
| GET | `/api/meters?status=Installed` | Filter meters by status |
| GET | `/api/meters?search=J100001` | Search meter records |
| GET | `/api/meters/:meterId` | Retrieve a meter by ID |
| GET | `/api/meters/:meterId/geo` | Retrieve meter coordinates |
| GET | `/api/meters/:meterId/consumption` | Retrieve energy consumption readings |

**Example:**

```http
GET /api/meters/J100001
```

### Transformers

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/transformers` | Retrieve transformer records |
| GET | `/api/transformers?page=1` | Retrieve a specific page |
| GET | `/api/transformers?search=Malviya` | Search transformer records |
| GET | `/api/transformers/:transformerId` | Retrieve a transformer by ID |
| GET | `/api/transformers/:transformerId/meters` | Retrieve meters mapped to a transformer |

**Example:**

```http
GET /api/transformers/DT-001/meters
```

Example response structure:

```json
{
  "transformerId": "DT-001",
  "count": 10,
  "data": [
    {
      "meterId": "J100000",
      "dtCode": "DT-001"
    }
  ]
}
```

The example is abbreviated; actual meter records may contain additional fields.

## Data Sources and Design

The API has two data sources:

1. **Local meter export:** Listing of meters, meter details, and transformer-to-meter map is taken from `data/meter-export.json`.
2. **Upstream portal:** Transformers, coordinates of meters and consumption readings are taken from the Urja Meter Ops portal.

The transformer-to-meter mapping is done via the `dtCode` of a meter which gets compared to the transformer identifier. This way, there is no need to perform separate upstream queries for every meter related to a transformer.

Authentication to the upstream portal is done in the API client, which maintains session cookies for authenticated requests.

## Error Handling

Input parameters validation, including pagination, and failures of the upstream portal are handled by the API. Depending on the situation, the clients will get either validation or upstream-service error responses.

## Security

- Credentials for the upstream portal are provided via environment variables.
- `.env` should not be committed.
- The API does not accidentally leak the credentials to the consumers of API.

## Assumptions and Design Decisions

- The local meter export is treated as the source of truth for meter records and transformer-to-meter mapping.

- Transformer information, meter coordinates, and consumption readings are retrieved from the upstream portal.

- The meter's dtCode is assumed to correspond to the transformer's code.

- Portal credentials are supplied through environment variables and are not committed to the repository.

- The API is read-only and does not modify upstream records.


## Known Limitations

- The meter endpoint functionality is limited by the existence and freshness of the local JSON export.
- The meter-to-transformer associations depend on the associations that are made in the JSON export.
- Transformers listing/search functionality is limited by the pagination of the data at the upstream portal.
- The geographic and consumption endpoints depend on connectivity to the upstream portal.
- The API is read-only at this point; it doesn’t change any data about meters or transformers.

## Future Enhancements

- Implement automated testing for routes, validators, and upstream failure cases.
- Implement better handling of session timeouts and retries.
- Implement caching of upstream data with clear freshness policy.
- Provide a search functionality for transformers that would cover all available pages.
- Add logging, rate limiting, and consistent error messages.
- Develop an OpenAPI description and validation for the API.

## Reflection

**1. What assumptions have you made?**

The local meter export is assumed to be the source of truth for the meter data. Also, the meter `dtCode` is equal to the transformer code.

**2. What was the hardest part, and how did you overcome it?**

The hardest part was authentication via the portal, which involved specifying certain headers and session cookies. By inspecting the login response and modifying the request configuration accordingly, the problem was overcome.

**3. If you could spend one more day, what would you change?**

More automated tests, better session handling, error handling and possibility to search transformers across all pages.

**4. What mistake have you made while solving this task?**

Initially, there were authentication errors because of incorrect request configuration in the login. After debugging the response, the mistake was identified.

**5. If you were evaluating your own solution, what would you criticize?**

Limited automated test coverage, reliance on the local meter export, which might become out of date, and incomplete session handling.

## License

This project was developed as a take-home engineering assignment for Flock Energy.
