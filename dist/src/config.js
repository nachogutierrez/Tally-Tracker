export const FOLDER_NAME = "TallyTracker";
export const FILE_NAME = "data.json";
export const FOLDER_MIME_TYPE = "application/vnd.google-apps.folder";
export const FILE_MIME_TYPE = "application/json";

export const DOM = {
  signedInView: document.getElementById("signed-in-view"),
  signedOutView: document.getElementById("signed-out-view"),
  signInBtnContainer: document.getElementById("sign-in-btn-container"),
  authContainer: document.getElementById("auth-container"),
  themeToggle: document.getElementById("theme-toggle"),
  themeIconLight: document.getElementById("theme-icon-light"),
  themeIconDark: document.getElementById("theme-icon-dark"),
  tabs: document.querySelectorAll(".tab-btn"),
  tabContents: document.querySelectorAll(".tab-content"),
  addCategoryForm: document.getElementById("add-category-form"),
  categoryList: document.getElementById("category-list"),
  catGoalType: document.getElementById("cat-goal-type"),
  catGoalTarget: document.getElementById("cat-goal-target"),
  logForm: document.getElementById("log-form"),
  logCategory: document.getElementById("log-cat"),
  logDelta: document.getElementById("log-delta"),
  logTimestamp: document.getElementById("log-timestamp"),
  logNote: document.getElementById("log-note"),
  logHistory: document.getElementById("log-history"),
  insightsTab: document.getElementById("tab-content-insights"),
};
