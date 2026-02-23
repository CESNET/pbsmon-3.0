#!/usr/bin/env node

import { generate } from "openapi-typescript-codegen";
import { mkdirSync, existsSync, readFileSync } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { loadEnv } from "vite";
import fetch from "node-fetch";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mode = process.env.NODE_ENV || "development";

const envDir = resolve(__dirname, "..");
const env = loadEnv(mode, envDir, "");

const envFile = join(envDir, ".env");
const envFileExists = existsSync(envFile);

if (process.env.DEBUG_ENV) {
  console.log(`[DEBUG] Loading env from: ${envDir}`);
  console.log(
    `[DEBUG] .env file exists: ${envFileExists ? "✓" : "✗"} at ${envFile}`
  );
  console.log(`[DEBUG] Mode: ${mode}`);
  console.log(`[DEBUG] API_BASE_URL from env: ${env.API_BASE_URL ? "✓" : "✗"}`);
  console.log(
    `[DEBUG] API_AUTH_USERNAME from env: ${env.API_AUTH_USERNAME ? "✓" : "✗"}`
  );
  console.log(
    `[DEBUG] API_AUTH_PASSWORD from env: ${env.API_AUTH_PASSWORD ? "✓" : "✗"}`
  );
}

const API_URL = env.API_BASE_URL || process.env.API_BASE_URL;
const API_AUTH_USERNAME =
  env.API_AUTH_USERNAME || process.env.API_AUTH_USERNAME;
const API_AUTH_PASSWORD =
  env.API_AUTH_PASSWORD || process.env.API_AUTH_PASSWORD;
const OPENAPI_SPEC_FILE =
  env.OPENAPI_SPEC_FILE || process.env.OPENAPI_SPEC_FILE;
const OUTPUT_DIR = join(__dirname, "../src/lib/generated-api");
const GENERATED_CLIENT_EXISTS = existsSync(OUTPUT_DIR);

// Provide helpful message about .env file location
if (!envFileExists && !process.env.API_BASE_URL && !process.env.OPENAPI_SPEC_FILE) {
  console.warn(`⚠️  No .env file found at ${envFile}`);
  console.warn(`   You can create a .env file in the web/ directory with:`);
  console.warn(`   API_BASE_URL=your_api_url`);
  console.warn(`   API_AUTH_USERNAME=your_username`);
  console.warn(`   API_AUTH_PASSWORD=your_password`);
  console.warn(`   OPENAPI_SPEC_FILE=path_to_openapi.json`);
}

if (!API_URL && !OPENAPI_SPEC_FILE) {
  if (GENERATED_CLIENT_EXISTS) {
    console.warn(
      "⚠️  Neither API_BASE_URL nor OPENAPI_SPEC_FILE is set, but generated API client exists. Skipping regeneration."
    );
    console.warn(
      "   To regenerate the client, set API_BASE_URL or OPENAPI_SPEC_FILE (or create a .env file)."
    );
    process.exit(0);
  } else {
    console.error(
      "ERROR: Neither API_BASE_URL nor OPENAPI_SPEC_FILE is set, and no generated API client exists."
    );
    console.error(
      `   Please set API_BASE_URL or OPENAPI_SPEC_FILE as an environment variable or in a .env file at: ${envFile}`
    );
    process.exit(1);
  }
}

const OPENAPI_JSON_URL = `${API_URL}/docs-json`;

async function fetchOpenApiSpec() {
  // Fetch from API directly
  try {
    console.log(`Fetching OpenAPI spec from ${OPENAPI_JSON_URL}...`);

    // Prepare headers with basic auth if credentials are provided
    const headers = {};
    if (API_AUTH_USERNAME && API_AUTH_PASSWORD) {
      const auth = Buffer.from(
        `${API_AUTH_USERNAME}:${API_AUTH_PASSWORD}`
      ).toString("base64");
      headers.Authorization = `Basic ${auth}`;
    }

    const response = await fetch(OPENAPI_JSON_URL, { headers });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch OpenAPI spec: ${response.status} ${response.statusText}`
      );
    }

    const spec = await response.json();
    return spec;
  } catch (error) {
    console.error("Error fetching OpenAPI spec:", error.message);
    console.error(
      "Make sure the API server is running or set API_URL environment variable"
    );
    if (process.env.WATCH_MODE !== "true") {
      process.exit(1);
    }
    throw error;
  }
}

function loadOpenApiSpecFromFile() {
  const resolvedPath = resolve(process.cwd(), OPENAPI_SPEC_FILE);
  if (!existsSync(resolvedPath)) {
    throw new Error(`OpenAPI spec file not found: ${resolvedPath}`);
  }

  console.log(`Loading OpenAPI spec from file: ${resolvedPath}`);
  const fileContent = readFileSync(resolvedPath, "utf-8");
  return JSON.parse(fileContent);
}

async function generateClient() {
  try {
    let openApiSpec;
    if (OPENAPI_SPEC_FILE) {
      try {
        openApiSpec = loadOpenApiSpecFromFile();
      } catch (error) {
        if (API_URL) {
          console.warn(
            `⚠️  Failed to load OPENAPI_SPEC_FILE (${error.message}). Falling back to ${OPENAPI_JSON_URL}.`
          );
          openApiSpec = await fetchOpenApiSpec();
        } else {
          throw error;
        }
      }
    } else {
      openApiSpec = await fetchOpenApiSpec();
    }

    // Ensure output directory exists
    mkdirSync(OUTPUT_DIR, { recursive: true });

    console.log("Generating TypeScript client...");

    // Generate the client
    await generate({
      input: openApiSpec,
      output: OUTPUT_DIR,
      httpClient: "fetch",
      clientName: "ApiClient",
      useOptions: true,
      useUnionTypes: true,
      exportCore: true,
      exportServices: true,
      exportModels: true,
      exportSchemas: false,
    });

    console.log(`✅ API client generated successfully in ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("Error generating API client:", error);
    if (process.env.WATCH_MODE !== "true") {
      process.exit(1);
    }
    throw error;
  }
}

generateClient();
