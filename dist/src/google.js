import { FOLDER_NAME, FILE_NAME, FOLDER_MIME_TYPE, FILE_MIME_TYPE } from './config.js';

let tokenClient;
let config = {};
let fileId = null;

export async function initGoogleClient(onSignedIn) {
  try {
    const response = await fetch("config.json");
    config = await response.json();
    
    await new Promise((resolve) => gapi.load("client", resolve));
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    });
    await gapi.client.load("oauth2", "v2");

    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: config.oauth_client,
      scope: "https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      callback: (tokenResponse) => tokenCallback(tokenResponse, onSignedIn),
    });

    const token = localStorage.getItem("google_auth_token");
    const expiry = localStorage.getItem("google_auth_token_expiry");
    if (token && expiry && new Date().getTime() < parseInt(expiry)) {
      gapi.client.setToken(JSON.parse(token));
      await onSignedIn();
    }
    return true;
  } catch (error) {
    console.error("Error loading config or initializing clients:", error);
    return false;
  }
}

async function tokenCallback(tokenResponse, onSignedIn) {
  if (tokenResponse.error) {
    console.error("Google token error:", tokenResponse.error);
    return;
  }
  const expiry = new Date().getTime() + tokenResponse.expires_in * 1000;
  localStorage.setItem("google_auth_token", JSON.stringify(tokenResponse));
  localStorage.setItem("google_auth_token_expiry", expiry);
  gapi.client.setToken(tokenResponse);
  await onSignedIn();
}

export function requestAccessToken() {
  tokenClient.requestAccessToken();
}

export function signOut(onSignedOut) {
  localStorage.removeItem("google_auth_token");
  localStorage.removeItem("google_auth_token_expiry");
  const token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token, () => {
      gapi.client.setToken("");
      fileId = null;
      onSignedOut();
    });
  }
}

export async function getUserProfile() {
  try {
    const profile = await gapi.client.oauth2.userinfo.get();
    return profile.result;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return {};
  }
}

async function getOrCreateFolder() {
  const query = `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME_TYPE}' and 'appDataFolder' in parents and trashed=false`;
  const response = await gapi.client.drive.files.list({ q: query, spaces: "appDataFolder", fields: "files(id, name)" });
  if (response.result.files.length > 0) {
    return response.result.files[0].id;
  }
  const folderResource = { name: FOLDER_NAME, mimeType: FOLDER_MIME_TYPE, parents: ["appDataFolder"] };
  const folder = await gapi.client.drive.files.create({ resource: folderResource, fields: "id" });
  return folder.result.id;
}

async function getOrCreateFile(folderId) {
  const query = `name='${FILE_NAME}' and '${folderId}' in parents and trashed=false`;
  const response = await gapi.client.drive.files.list({ q: query, spaces: "appDataFolder", fields: "files(id, name)" });
  if (response.result.files.length > 0) {
    return response.result.files[0].id;
  }
  
  const fileMetadata = { name: FILE_NAME, parents: [folderId], mimeType: FILE_MIME_TYPE };
  const skeletonContent = { v: 1, meta: { rev: 0, created: new Date().toISOString() }, cats: {}, logs: [] };
  
  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;
  const multipartRequestBody =
    `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    JSON.stringify(fileMetadata) +
    `${delimiter}Content-Type: ${FILE_MIME_TYPE}\r\n\r\n` +
    JSON.stringify(skeletonContent) +
    close_delim;

  const request = gapi.client.request({
    path: "/upload/drive/v3/files",
    method: "POST",
    params: { uploadType: "multipart" },
    headers: { "Content-Type": `multipart/related; boundary="${boundary}"` },
    body: multipartRequestBody,
  });
  
  const result = await request;
  return result.result.id;
}

async function readFile(id) {
  const response = await gapi.client.drive.files.get({ fileId: id, alt: "media" });
  return response.result;
}

export async function loadDataFromDrive() {
  try {
    const folderId = await getOrCreateFolder();
    fileId = await getOrCreateFile(folderId);
    const fileContent = await readFile(fileId);
    if (!fileContent.logs) fileContent.logs = [];
    if (!fileContent.cats) fileContent.cats = {};
    return fileContent;
  } catch (error) {
    console.error("Drive check failed:", error);
    const errorMessage = error.result?.error?.message || error.message;
    alert(`An error occurred: ${errorMessage}`);
    return null;
  }
}

export async function saveStateToDrive(state) {
  if (!fileId) {
    console.error("No fileId, cannot save.");
    return;
  }
  try {
    state.meta.rev = (state.meta.rev || 0) + 1;
    await gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media' },
      body: JSON.stringify(state)
    });
  } catch (error) {
    console.error("Failed to save state to Drive:", error);
    alert("Error saving data. Please try again.");
  }
}
