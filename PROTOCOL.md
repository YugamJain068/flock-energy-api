# Portal Protocol Notes

## 1. Overview

The Urja Meter Ops portal (`https://urja-ops.flockenergy.tech`) shows meter and distribution transformer (DT) data, which contains meter-related information, geographic coordinates, and energy consumption values.

The web portal is used in conjunction with HTTP endpoints. The API created as part of the project publishes some of the portal’s data on a lighter REST interface.

## 2. Data available

The following data types have been noted during investigation:

- **Meters:** Meter ID, serial number, manufacturer, and type of phases and installation.
- **Hierarchy:** zone, circle, division, subdivision, substation, feeder, and distribution transformer (DT) with their names and codes.
- **Coordinates:** Latitude and longitude for a meter.
- **Consumption data:** Time-dependent readings such as kWh, kVAh, and phase voltage.
- **Transformers:** Code, name, feeder code and capacity in kVA.

The meter information can also be accessed through a local JSON file, `data/meter-export.json`, which may be used in meter queries and transformer-to-meter relations.

## 3. Access and Authentication

The portal needs authentication for endpoints employed in this project.

Authentication is done by transmitting a form-encoded `POST` request to `/login` with the portal's email and password. The request carries the desired `Origin`, `Referer`, and `x-sveltekit-action` headers.

Once authenticated, a successful login will initiate the session via a cookie called `__Secure-better-auth.session_token`. All the subsequent requests will employ the session cookie.

Credentials are saved in the environmental variables forcing them to not be stored in version control.

## 4. Endpoints and Request Behavior

The following upstream endpoints were explored:

| Endpoint | Purpose |
|---|---|
| `POST /login` | Authenticate and establish a session |
| `GET /portal/dts?page=1` | Retrieve paginated transformer data |
| `GET /portal/meters/{meterId}/geo` | Retrieve meter coordinates |
| `GET /portal/meters/{meterId}/energy` | Retrieve meter consumption readings |

The transformer listing response includes pagination metadata such as `total`, `page`, and `pageSize`. The meter geographic endpoint returns latitude and longitude, while the energy endpoint returns timestamped readings.

## 5. Observations and Quirks


- Requests sent without a session that is authenticated can lead to unauthorized responses.
- The specific POST request to the login endpoint requests particular headers as well as form-encoded data. If the request is wrong, it may return the error regarding cross-site form submission.
- The login response may be HTTP 200. However, it might contain information about a redirect within the response body. Thus, it's better to check the session cookie.
- Transformer information is paginated; hence, to retrieve certain transformer information it is necessary to check various pages.
- Meter-to-transformer mapping is done locally based on the meter `dtCode` and the transformer code.
- Consumption values are returned as timestamped strings. 


## 6. Limitations


The local meter export may become obsolete if any changes are made in the portal. Geographic and consumption requests are verified only if the portal can be used and the session is authenticated. The API does not change any records in the portal and serves only for reading API data.

