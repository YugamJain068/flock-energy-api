
import "dotenv/config";
import axios from "axios";
import { wrapper } from "axios-cookiejar-support";
import { CookieJar } from "tough-cookie";

const BASE_URL = "https://urja-ops.flockenergy.tech";

if (!process.env.PORTAL_EMAIL || !process.env.PORTAL_PASSWORD) {
  throw new Error(
    "Missing PORTAL_EMAIL or PORTAL_PASSWORD in your .env file"
  );
}

const jar = new CookieJar();

const client = wrapper(
  axios.create({
    baseURL: BASE_URL,
    jar,
    timeout: 15000,
    headers: {
      Accept: "application/json",
    },
  })
);

let loginPromise = null;

async function login() {
  const form = new URLSearchParams({
    email: process.env.PORTAL_EMAIL,
    password: process.env.PORTAL_PASSWORD,
  });

  const response = await client.post("/login", form.toString(), {
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: BASE_URL,
      Referer: `${BASE_URL}/login`,
      "x-sveltekit-action": "true",
    },
    maxRedirects: 0,
    validateStatus: (status) => status >= 200 && status < 400,
  });

  const cookies = await jar.getCookies(BASE_URL);
  const sessionCookie = cookies.find(
    (cookie) => cookie.key === "__Secure-better-auth.session_token"
  );

  if (!sessionCookie) {
    throw new Error(
      `Login did not establish a session. HTTP status: ${response.status}`
    );
  }
}

async function ensureLoggedIn() {
  if (!loginPromise) {
    loginPromise = login().catch((error) => {
      loginPromise = null;
      throw error;
    });
  }

  return loginPromise;
}

export async function portalGet(endpoint) {
  await ensureLoggedIn();

  try {
    const response = await client.get(endpoint);
    return response.data;
  } catch (error) {
    if (error.response?.status === 401 || error.response?.status === 403) {
      loginPromise = null;
    }

    throw error;
  }
}
