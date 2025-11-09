export const FOLDER_NAME = "TallyTracker";
export const FILE_NAME = "tally_tracker_data.json";
export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const FILE_MIME_TYPE = "application/json";

let config = {};
let fileId = null;
let lastKnownRevisionId = null;

// Custom error for handling optimistic concurrency conflicts
export class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

export async function initGoogleClient() {
  try {
    const response = await fetch("config.json");
    config = await response.json();
    
    await new Promise((resolve) => gapi.load("client", resolve));
    await gapi.client.init({
      discoveryDocs: ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"],
    });
    
    return true;
  } catch (error) {
    console.error("Error loading config or initializing clients:", error);
    return false;
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

async function getFileContentAndRevision(id) {
  const metaResponse = await gapi.client.drive.files.get({
    fileId: id,
    fields: 'headRevisionId'
  });
  lastKnownRevisionId = metaResponse.result.headRevisionId;

  const contentResponse = await gapi.client.drive.files.get({ fileId: id, alt: "media" });
  return contentResponse.result;
}

export async function loadDataFromDrive() {
  try {
    const folderId = await getOrCreateFolder();
    fileId = await getOrCreateFile(folderId);
    const fileContent = await getFileContentAndRevision(fileId);
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
    throw new Error("No fileId, cannot save.");
  }

  // Pre-flight check for conflicts
  const metaResponse = await gapi.client.drive.files.get({
    fileId: fileId,
    fields: 'headRevisionId'
  });
  const remoteRevisionId = metaResponse.result.headRevisionId;

  if (lastKnownRevisionId && remoteRevisionId !== lastKnownRevisionId) {
    throw new ConflictError('File has been modified by another client.');
  }

  try {
    state.meta.rev = (state.meta.rev || 0) + 1;
    const response = await gapi.client.request({
      path: `/upload/drive/v3/files/${fileId}`,
      method: 'PATCH',
      params: { uploadType: 'media', fields: 'headRevisionId' },
      body: JSON.stringify(state)
    });
    // Update revision ID after successful save
    lastKnownRevisionId = response.result.headRevisionId;
  } catch (error) {
    console.error("Failed to save state to Drive:", error);
    alert("Error saving data. Please try again.");
    throw error; // Re-throw to be handled by the caller
  }
}
