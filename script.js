
    (() => {
"use strict";

const THEME_STORAGE_KEY = "RONDLIST_THEME";
const VISION_STORAGE_KEY = "RONDLIST_VISION_SETTINGS";
const VISION_SCALES = Object.freeze(["normal", "large", "larger"]);

function setTheme(theme, options = {}) {
const nextTheme = theme === "light" ? "light" : "dark";
const isDark = nextTheme === "dark";
const toggle = document.getElementById("theme-toggle");

document.documentElement.dataset.theme = nextTheme;
document
.querySelector('meta[name="theme-color"]')
.setAttribute("content", "#ED7A1E");

if (toggle) {
const nextModeLabel = isDark ? "claro" : "escuro";
toggle.setAttribute("aria-label", `Ativar modo ${nextModeLabel}`);
toggle.setAttribute("aria-pressed", String(isDark));
toggle.setAttribute("title", `Ativar modo ${nextModeLabel}`);
}

if (options.persist) {
try {
localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
} catch {
// O tema continua ativo mesmo quando o navegador bloqueia o armazenamento.
}
}
}

function initializeTheme() {
setTheme(document.documentElement.dataset.theme);
document.getElementById("theme-toggle").addEventListener("click", () => {
const currentTheme = document.documentElement.dataset.theme;
setTheme(currentTheme === "dark" ? "light" : "dark", {
persist: true
});
});
}

function setVisionPanelOpen(isOpen) {
const panel = document.getElementById("vision-panel");
const toggle = document.getElementById("vision-toggle");

panel.hidden = !isOpen;
toggle.setAttribute("aria-expanded", String(isOpen));
toggle.setAttribute(
"aria-label",
isOpen
? "Fechar ajustes para baixa visão"
: "Abrir ajustes para baixa visão"
);
}

function applyVisionSettings(settings, options = {}) {
const scale = VISION_SCALES.includes(settings.scale)
? settings.scale
: "normal";
const highContrast = settings.highContrast === true;

document.documentElement.dataset.visionScale = scale;
document.documentElement.dataset.visionContrast = highContrast
? "high"
: "standard";

document
.querySelectorAll("[data-vision-scale-option]")
.forEach((button) => {
button.setAttribute(
"aria-pressed",
String(button.dataset.visionScaleOption === scale)
);
});

const contrastButton = document.getElementById("vision-contrast");
contrastButton.setAttribute("aria-pressed", String(highContrast));
document.getElementById("vision-contrast-state").textContent =
highContrast ? "Ativado" : "Desativado";

if (options.persist) {
try {
localStorage.setItem(
VISION_STORAGE_KEY,
JSON.stringify({ scale, highContrast })
);
} catch {
// As preferências continuam ativas durante a sessão atual.
}
}
}

function currentVisionSettings() {
return {
scale: document.documentElement.dataset.visionScale || "normal",
highContrast:
document.documentElement.dataset.visionContrast === "high"
};
}

function initializeVisionTools() {
const toggle = document.getElementById("vision-toggle");
const panel = document.getElementById("vision-panel");
const contrastButton = document.getElementById("vision-contrast");

applyVisionSettings(currentVisionSettings());

toggle.addEventListener("click", () => {
setVisionPanelOpen(panel.hidden);
});

document
.querySelectorAll("[data-vision-scale-option]")
.forEach((button) => {
button.addEventListener("click", () => {
const settings = currentVisionSettings();
applyVisionSettings(
{
...settings,
scale: button.dataset.visionScaleOption
},
{ persist: true }
);
});
});

contrastButton.addEventListener("click", () => {
const settings = currentVisionSettings();
applyVisionSettings(
{
...settings,
highContrast: !settings.highContrast
},
{ persist: true }
);
});

document.getElementById("vision-reset").addEventListener("click", () => {
applyVisionSettings(
{ scale: "normal", highContrast: false },
{ persist: true }
);
});

document.addEventListener("click", (event) => {
if (
!panel.hidden &&
!panel.contains(event.target) &&
!toggle.contains(event.target)
) {
setVisionPanelOpen(false);
}
});
}

const CONFIG = Object.freeze({
workerProxy: "https://rondlist.rondeiros2023.workers.dev/",
cacheDurationMs: 5 * 60 * 1000,
auth: Object.freeze({
databaseName: "RondListAuth",
storeName: "session",
cacheKey: "current",
revalidateIntervalMs: 60 * 1000
}),
sheets: Object.freeze({
rondListApi: "https://script.google.com/macros/s/AKfycbyDwewHsL1JjfcnOUH_h6R9Ouz68uSjypEQQd9FvHbg3U0_L1vgLXxI38OZJibUE3w/exec"
}),
forum: Object.freeze({
origin: "https://www.policiarcc.com",
automaticDelayMs: 13000,
bridgeTimeoutMs: 25000
})
});

const CACHE_PREFIX = "RONDLIST_CACHE_V2_";
const ROLE_OPTIONS = Object.freeze([
"Líder",
"Vice-Líder",
"Consultor(a)",
"Ministro(a) da Administração",
"Ministro(a) da Atualização",
"Ministro(a) da Contabilidade",
"Ministro(a) da Documentação",
"Ministro(a) das Finanças",
"Ministro(a) da Segurança",
"Estagiário(a)",
"Graduador(a)",
"Tutor(a)",
"Rondeiro(a)"
]);
const NEXUS_MONTHS = Object.freeze([
"Jan",
"Fev",
"Mar",
"Abr",
"Mai",
"Jun",
"Jul",
"Ago",
"Set",
"Out",
"Nov",
"Dez"
]);
const DATE_HEADER_KEYS = Object.freeze([
"ENTRADA",
"DATAPROMOREB",
"PROMOREBAIX",
"INICIO",
"RETORNO",
"TERMINO"
]);
let currentUser = null;
let authRevalidationTimer = null;

function openAuthDatabase() {
return new Promise((resolve, reject) => {
if (!window.indexedDB) {
reject(new Error("IndexedDB indisponível."));
return;
}

const request = indexedDB.open(CONFIG.auth.databaseName, 1);
request.onupgradeneeded = () => {
const database = request.result;
if (!database.objectStoreNames.contains(CONFIG.auth.storeName)) {
database.createObjectStore(CONFIG.auth.storeName);
}
};
request.onsuccess = () => resolve(request.result);
request.onerror = () => reject(request.error);
});
}

async function readCachedAuthentication() {
try {
const database = await openAuthDatabase();
return await new Promise((resolve, reject) => {
const transaction = database.transaction(
CONFIG.auth.storeName,
"readonly"
);
const request = transaction
.objectStore(CONFIG.auth.storeName)
.get(CONFIG.auth.cacheKey);
request.onsuccess = () => resolve(request.result || null);
request.onerror = () => reject(request.error);
transaction.oncomplete = () => database.close();
});
} catch {
return null;
}
}

async function saveCachedAuthentication(user) {
try {
const database = await openAuthDatabase();
await new Promise((resolve, reject) => {
const transaction = database.transaction(
CONFIG.auth.storeName,
"readwrite"
);
transaction
.objectStore(CONFIG.auth.storeName)
.put(
{ user: { ...user }, verifiedAt: Date.now() },
CONFIG.auth.cacheKey
);
transaction.oncomplete = resolve;
transaction.onerror = () => reject(transaction.error);
});
database.close();
} catch {
// O login continua válido durante a sessão atual.
}
}

async function clearCachedAuthentication() {
try {
const database = await openAuthDatabase();
await new Promise((resolve, reject) => {
const transaction = database.transaction(
CONFIG.auth.storeName,
"readwrite"
);
transaction
.objectStore(CONFIG.auth.storeName)
.delete(CONFIG.auth.cacheKey);
transaction.oncomplete = resolve;
transaction.onerror = () => reject(transaction.error);
});
database.close();
} catch {
// Não há cache local para remover.
}
}

function currentUserRoles(user = currentUser) {
if (!user) return [];
return [user.role, ...(Array.isArray(user.roles) ? user.roles : [])]
.map((role) => String(role || "").trim())
.filter(Boolean);
}

function canCurrentUserEdit(user = currentUser) {
if (user && typeof user.canEdit === "boolean") {
return user.canEdit;
}
return currentUserRoles(user).some((role) =>
/^(?:DESENVOLVEDOR(?:\(A\))?|LIDER|VICE-LIDER)$/.test(
normalizeLookup(role)
)
);
}

function canCurrentUserManageAccess(user = currentUser) {
if (user && typeof user.canManageAccess === "boolean") {
return user.canManageAccess;
}
return currentUserRoles(user).some((role) =>
/^(?:DESENVOLVEDOR(?:\(A\))?|LIDER|VICE-LIDER)$/.test(
normalizeLookup(role)
)
);
}

function requireEditAccess(options = {}) {
if (canCurrentUserEdit()) return true;
if (options.notify !== false) {
showToast(
"Seu usuário não possui acesso total para editar.",
"warning"
);
}
return false;
}

function requireManageAccess(options = {}) {
if (canCurrentUserManageAccess()) return true;
if (options.notify !== false) {
showToast(
"Somente a Liderança e Desenvolvedores podem gerenciar acessos adicionais.",
"warning"
);
}
return false;
}

function applyAccessMode() {
const canEdit = canCurrentUserEdit();
const canManageAccess = canCurrentUserManageAccess();
document.documentElement.dataset.accessMode = canEdit
? "full"
: "read-only";

if (!canEdit) {
appState.editingMembers = false;
appState.removingMembers = false;
appState.addingMember = false;
appState.memberDrafts.clear();
appState.selectedMemberRows.clear();
[
"add-member-editor",
"requirements-dialog",
"settings-editor",
"layout-editor"
].forEach(
(id) => {
const dialog = document.getElementById(id);
if (dialog && dialog.open) dialog.close();
}
);
}

const editLayoutButton = document.getElementById("edit-layout");
editLayoutButton.hidden = !canEdit;
editLayoutButton.disabled = !canEdit || !appState.settings.length;
document.getElementById("nav-settings").hidden = !canEdit;
document.getElementById("additional-access-section").hidden =
!canManageAccess;

if (!canManageAccess) {
appState.additionalAccess = [];
appState.additionalAccessRoles = [];
appState.availableAccessRoles = [];
renderAdditionalAccess();
updateAdditionalAccessRoleOptions();
}

if (!canEdit && appState.currentView === "settings") {
navigateToView("members", { force: true });
}

updateMemberEditControls();
if (appState.settings.length) renderSettings();
}

const appState = {
headers: [],
rows: [],
settings: [],
additionalAccess: [],
additionalAccessRoles: [],
availableAccessRoles: [],
publishing: null,
maxDataRow: 1,
currentView: "members",
search: "",
editingMembers: false,
removingMembers: false,
addingMember: false,
selectedMemberRows: new Set(),
memberDrafts: new Map(),
booleanColumns: new Set(),
loading: false,
savingMembers: false,
organizingMembers: false,
requirementsBusy: false,
publishingBusy: false,
publishingResults: createPublishingResults(),
editingSettingsRow: null,
editingLayoutOwnerRow: null,
loaded: false
};

function buildWorkerUrl(targetUrl) {
const url = new URL(CONFIG.workerProxy);
url.searchParams.set("url", targetUrl);
return url.toString();
}

async function fetchViaWorker(targetUrl, options = {}) {
const {
forceRefresh = false,
cacheDurationMs = CONFIG.cacheDurationMs,
timeoutMs = 15000
} = options;

const cacheKey = `${CACHE_PREFIX}${targetUrl}`;

if (!forceRefresh) {
try {
const cached = JSON.parse(localStorage.getItem(cacheKey) || "null");
if (cached && Date.now() - cached.timestamp < cacheDurationMs) {
return cached.data;
}
} catch {
localStorage.removeItem(cacheKey);
}
}

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), timeoutMs);

try {
const response = await fetch(buildWorkerUrl(targetUrl), {
signal: controller.signal
});

if (!response.ok) {
throw new Error(`Worker respondeu com status ${response.status}.`);
}

const text = await response.text();
if (!text.trim()) {
throw new Error("O Worker retornou uma resposta vazia.");
}

try {
localStorage.setItem(
cacheKey,
JSON.stringify({ timestamp: Date.now(), data: text })
);
} catch {
// O cache é opcional e não deve impedir a consulta.
}

return text;
} catch (error) {
if (error.name === "AbortError") {
throw new Error("A consulta excedeu o tempo limite.");
}
throw error;
} finally {
clearTimeout(timeout);
}
}

async function requestRondList(
action,
payload = null,
options = {}
) {
const { forceRefresh = false } = options;
const target = new URL(CONFIG.sheets.rondListApi);
const requestedUsername = cleanCell(
(payload && payload.username) ||
(currentUser && currentUser.nick) ||
""
);
const isWrite =
action.startsWith("save") ||
action === "addAdditionalAccess" ||
action.startsWith("remove");
if (isWrite && !requireEditAccess({ notify: false })) {
throw new Error(
"Seu usuário não possui acesso total para editar."
);
}
const controller = new AbortController();
const timeout = window.setTimeout(() => controller.abort(), 20000);
const request = {
method: isWrite ? "POST" : "GET",
signal: controller.signal,
cache: "no-store"
};

if (isWrite) {
request.headers = { "Content-Type": "text/plain;charset=utf-8" };
request.body = JSON.stringify({
action,
...(payload || {}),
username: requestedUsername
});
} else {
target.searchParams.set("action", action);
if (requestedUsername) {
target.searchParams.set("username", requestedUsername);
}
if (forceRefresh) {
target.searchParams.set("force", "1");
target.searchParams.set("_", String(Date.now()));
request.headers = {
"Cache-Control": "no-cache, no-store, max-age=0",
Pragma: "no-cache"
};
}
}

try {
const response = await fetch(buildWorkerUrl(target.toString()), request);
const text = await response.text();
let result;

try {
result = JSON.parse(text);
} catch {
throw new Error("A API da RondList retornou uma resposta inválida.");
}

if (!response.ok || !result.ok) {
const message = result && result.error ? result.error : "Falha na API.";
if (/não autorizado/i.test(message)) {
throw new Error(
"O Worker ainda precisa receber a chave segura da RondList."
);
}
throw new Error(message);
}

return result;
} catch (error) {
if (error.name === "AbortError") {
throw new Error("O serviço demorou demais para responder.");
}
throw error;
} finally {
window.clearTimeout(timeout);
}
}

function setWorkspaceState(state, label) {
const element = document.getElementById("workspace-state");
element.classList.remove("is-ready", "is-error");
if (state) element.classList.add(`is-${state}`);
element.textContent = label;
}

function setDataLoading(isLoading) {
appState.loading = isLoading;
document.getElementById("refresh-members").disabled =
isLoading ||
appState.editingMembers ||
appState.removingMembers ||
appState.addingMember;
document.getElementById("refresh-settings").disabled = isLoading;
document.getElementById("edit-layout").hidden =
!canCurrentUserEdit();
document.getElementById("edit-layout").disabled =
!canCurrentUserEdit() || isLoading || !appState.settings.length;
updateMemberEditControls();
}

function formatCount(value) {
return Number(value || 0).toLocaleString("pt-BR");
}

function normalizeLookup(value) {
return String(value || "")
.normalize("NFD")
.replace(/[\u0300-\u036f]/g, "")
.replace(/\./g, "")
.trim()
.toUpperCase();
}

function headerIndex(label) {
const normalized = normalizeLookup(label);
return appState.headers.findIndex(
(header) => normalizeLookup(header) === normalized
);
}

function headerKey(value) {
return normalizeLookup(value).replace(/[^A-Z0-9]+/g, "");
}

function headerIndexAny(...labels) {
const keys = labels.map(headerKey);
return appState.headers.findIndex((header) =>
keys.includes(headerKey(header))
);
}

function memberFieldIndexes() {
return {
role: headerIndex("CARGO"),
nickname: headerIndex("NICKNAME"),
entry: headerIndex("ENTRADA"),
promotion: headerIndexAny(
"DATA (PROMO/REB)",
"PROMO. / REBAIX."
),
licenseStart: headerIndexAny("INÍCIO", "INICIO"),
licenseDays: headerIndex("DIAS"),
licenseReturn: headerIndexAny("RETORNO", "TÉRMINO", "TERMINO")
};
}

function isDateColumn(index) {
return DATE_HEADER_KEYS.includes(headerKey(appState.headers[index]));
}

function canonicalRoleName(role) {
const value = String(role || "").trim();
const normalized = normalizeLookup(value);

if (normalized.startsWith("MINISTRO(A)")) {
return value.replace(/^Ministro\(a\)/i, "Ministro(a)");
}
return value;
}

function roleRank(role) {
const normalized = normalizeLookup(canonicalRoleName(role));
if (normalized === "LIDER") return 0;
if (normalized === "VICE-LIDER") return 1;
if (normalized === "CONSULTOR(A)") return 2;
if (normalized.startsWith("MINISTRO(A)")) return 3;
if (normalized === "ESTAGIARIO(A)") return 4;
if (normalized === "GRADUADOR(A)") return 5;
if (normalized === "TUTOR(A)") return 6;
if (normalized === "RONDEIRO(A)") return 7;
return 8;
}

function roleOptionIndex(role) {
const normalized = normalizeLookup(canonicalRoleName(role));
const index = ROLE_OPTIONS.findIndex(
(option) => normalizeLookup(option) === normalized
);
return index === -1 ? ROLE_OPTIONS.length : index;
}

function isConsultantRole(role) {
return normalizeLookup(role) === "CONSULTOR(A)";
}

function parseNexusDate(value) {
const raw = String(value || "").trim();
if (!raw) return null;

let year;
let month;
let day;
let match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);

if (match) {
year = Number(match[1]);
month = Number(match[2]) - 1;
day = Number(match[3]);
} else {
match = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
if (match) {
day = Number(match[1]);
month = Number(match[2]) - 1;
year = Number(match[3]);
} else {
match = raw.match(/^(\d{1,2})\s+([A-Za-zÀ-ÿ.]+)\s+(\d{4})$/);
if (!match) return null;

const aliases = {
JAN: 0,
FEV: 1,
FEB: 1,
MAR: 2,
ABR: 3,
APR: 3,
MAI: 4,
MAY: 4,
JUN: 5,
JUL: 6,
AGO: 7,
AUG: 7,
SET: 8,
SEP: 8,
OUT: 9,
OCT: 9,
NOV: 10,
DEZ: 11,
DEC: 11
};
day = Number(match[1]);
month = aliases[normalizeLookup(match[2]).slice(0, 3)];
year = Number(match[3]);
}
}

if (
!Number.isInteger(year) ||
!Number.isInteger(month) ||
!Number.isInteger(day) ||
month < 0 ||
month > 11 ||
day < 1 ||
day > 31
) {
return null;
}

const date = new Date(Date.UTC(year, month, day));
if (
date.getUTCFullYear() !== year ||
date.getUTCMonth() !== month ||
date.getUTCDate() !== day
) {
return null;
}

return { year, month, day };
}

function formatNexusDate(value) {
const parsed = parseNexusDate(value);
if (!parsed) return String(value || "").trim();
return `${String(parsed.day).padStart(2, "0")} ${
NEXUS_MONTHS[parsed.month]
} ${parsed.year}`;
}

function nexusDateToIso(value) {
const parsed = parseNexusDate(value);
if (!parsed) return "";
return `${parsed.year}-${String(parsed.month + 1).padStart(
2,
"0"
)}-${String(parsed.day).padStart(2, "0")}`;
}

function dateSortValue(value) {
const parsed = parseNexusDate(value);
return parsed
? Date.UTC(parsed.year, parsed.month, parsed.day)
: Number.POSITIVE_INFINITY;
}

function calculateMemberReturnDate(startValue, daysValue) {
const start = parseNexusDate(startValue);
const daysText = String(daysValue ?? "").trim();
if (!start || !/^\d+$/.test(daysText)) return "";

const days = Number(daysText);
if (!Number.isSafeInteger(days) || days < 0) return "";
const date = new Date(
Date.UTC(start.year, start.month, start.day) +
days * 24 * 60 * 60 * 1000
);
return formatNexusDate(
`${date.getUTCFullYear()}-${String(
date.getUTCMonth() + 1
).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`
);
}

function applyCalculatedReturnDate(values, options = {}) {
const nextValues = values.slice();
const indexes = memberFieldIndexes();
if (
indexes.licenseStart < 0 ||
indexes.licenseDays < 0 ||
indexes.licenseReturn < 0
) {
return nextValues;
}
const calculated = calculateMemberReturnDate(
nextValues[indexes.licenseStart],
nextValues[indexes.licenseDays]
);
if (calculated || options.clearIncomplete) {
nextValues[indexes.licenseReturn] = calculated;
}
return nextValues;
}

function normalizeConsultantValues(values) {
const normalized = values.slice();
const indexes = memberFieldIndexes();
if (!isConsultantRole(normalized[indexes.role])) return normalized;

normalized.forEach((_, index) => {
if (index !== indexes.role && index !== indexes.nickname) {
normalized[index] = "";
}
});
return normalized;
}

function prepareMemberValues(values) {
const currentValues = applyCalculatedReturnDate(values);
const roleIndex = memberFieldIndexes().role;
if (roleIndex >= 0) {
currentValues[roleIndex] = canonicalRoleName(
currentValues[roleIndex]
);
}

const normalized = normalizeConsultantValues(currentValues);
if (isConsultantRole(normalized[memberFieldIndexes().role])) {
return normalized;
}

return normalized.map((value, index) =>
isDateColumn(index) && parseNexusDate(value)
? formatNexusDate(value)
: value
);
}

function compareMemberRows(left, right) {
const indexes = memberFieldIndexes();
const leftRole = left.values[indexes.role];
const rightRole = right.values[indexes.role];
const rank = roleRank(leftRole);
const rankDifference = rank - roleRank(rightRole);
if (rankDifference) return rankDifference;

const isRondeiro = rank === 7;
const isMinistro = rank === 3;

if (!isMinistro) {
const dateIndex = isRondeiro ? indexes.entry : indexes.promotion;
const dateDifference =
dateSortValue(left.values[dateIndex]) -
dateSortValue(right.values[dateIndex]);
if (dateDifference) return dateDifference;
}

const roleDifference =
roleOptionIndex(leftRole) - roleOptionIndex(rightRole);
if (roleDifference) return roleDifference;

return String(left.values[indexes.nickname] || "").localeCompare(
String(right.values[indexes.nickname] || ""),
"pt-BR",
{ sensitivity: "base" }
);
}

function sortMembers() {
appState.rows.sort(compareMemberRows);
}

function buildCompactMemberRows(members) {
const nicknameIndex = memberFieldIndexes().nickname;
const seenNicknames = new Map();
const repeatedNicknames = new Set();
const rows = members
.slice()
.sort(compareMemberRows)
.map((member, index) => {
const values = prepareMemberValues(member.values).map((value) =>
String(value ?? "").trim()
);
const nickname = String(values[nicknameIndex] || "").trim();
const nicknameKey = nickname.toLocaleLowerCase("pt-BR");

if (nicknameKey) {
if (seenNicknames.has(nicknameKey)) {
repeatedNicknames.add(nickname);
} else {
seenNicknames.set(nicknameKey, true);
}
}

return {
row: index + 2,
values
};
});

if (repeatedNicknames.size) {
throw new Error(
`Nickname duplicado: ${Array.from(repeatedNicknames).join(
", "
)}. Corrija ou remova a repetição antes de salvar.`
);
}

return rows;
}

/**
* Envia a listagem final (já ordenada e compactada por buildCompactMemberRows)
* para o backend, que reescreve A:J inteiro na aba de roster — isso vale
* tanto para editar quanto para adicionar ou remover membros, então toda
* mutação já sai organizada e uma remoção apaga a linha de verdade. Como o
* servidor grava na mesma ordem enviada, os números de linha calculados aqui
* (index + 2) já são os definitivos: não é preciso reler do servidor.
*/
async function persistRosterList(members) {
const rows = buildCompactMemberRows(members);
await requestRondList("saveRoster", { rows });
appState.rows = rows;
appState.selectedMemberRows.clear();
return rows;
}

function filteredMembers() {
const term = appState.search.trim().toLocaleLowerCase("pt-BR");
if (!term) return appState.rows;

return appState.rows.filter((row) =>
memberDraft(row).some((value) =>
String(value || "").toLocaleLowerCase("pt-BR").includes(term)
)
);
}

function booleanState(value) {
const normalized = String(value ?? "").trim().toLowerCase();
if (normalized === "true") return "true";
if (normalized === "false") return "false";
return "empty";
}

function detectBooleanColumns() {
const columns = new Set();

appState.headers.forEach((_, index) => {
const header = String(appState.headers[index] || "")
.trim()
.toUpperCase();
const populated = appState.rows
.map((row) => booleanState(row.values[index]))
.filter((state) => state !== "empty");

if (
["G", "RL", "REB"].includes(header) ||
(populated.length &&
populated.every(
(state) => state === "true" || state === "false"
))
) {
columns.add(index);
}
});

return columns;
}

function memberDraft(row) {
return appState.memberDrafts.get(row.row) || row.values;
}

function memberEditableValues(row) {
return row.values;
}

function isMemberRowDirty(row) {
const draft = appState.memberDrafts.get(row.row);
if (!draft) return false;
const baseline = memberEditableValues(row);

return draft.some(
(value, index) =>
String(value ?? "").trim() !==
String(baseline[index] ?? "").trim()
);
}

function updateBooleanToggle(button, state, columnIndex) {
const labels = {
true: "Selecionado",
false: "Desmarcado",
empty: "Sem valor"
};
const header = appState.headers[columnIndex] || `Campo ${columnIndex + 1}`;

button.dataset.state = state;
button.textContent = "";
button.setAttribute("aria-pressed", String(state === "true"));
button.setAttribute("aria-label", `${header}: ${labels[state]}`);
button.title =
state === "empty"
? "Sem valor definido"
: state === "true"
? "Selecionado"
: "Desmarcado";
}

function createRoleSelect(value, options = {}) {
const select = document.createElement("select");
const selectedValue = canonicalRoleName(value);
select.className = options.className || "table-select";
if (options.id) select.id = options.id;
if (options.index !== undefined) select.dataset.index = options.index;
if (options.disabled) select.disabled = true;
select.setAttribute(
"aria-label",
options.label || "Selecionar cargo"
);

const blank = document.createElement("option");
blank.value = "";
blank.textContent = "Selecione";
select.appendChild(blank);

if (selectedValue && !ROLE_OPTIONS.includes(selectedValue)) {
const current = document.createElement("option");
current.value = selectedValue;
current.textContent = selectedValue;
select.appendChild(current);
}

ROLE_OPTIONS.forEach((role) => {
const option = document.createElement("option");
option.value = role;
option.textContent = role;
select.appendChild(option);
});

select.value = selectedValue;
if (options.onChange) {
select.addEventListener("change", () =>
options.onChange(select.value, select)
);
}
return select;
}

function createDateControl(value, options = {}) {
const control = document.createElement("div");
const formatted = formatNexusDate(value);
control.className = `date-control${formatted ? "" : " is-empty"}`;
if (options.calculated) control.classList.add("is-calculated");
control.dataset.value = formatted;

const display = document.createElement("span");
display.className = "date-control__value";
display.textContent = formatted || "—";

const calendar = document.createElement("span");
calendar.className = "date-control__calendar ti ti-calendar";
calendar.setAttribute("aria-hidden", "true");

const input = document.createElement("input");
input.className = "date-control__native";
input.type = "date";
input.value = nexusDateToIso(value);
input.disabled = Boolean(options.disabled);
input.setAttribute("aria-label", options.label || "Selecionar data");
if (options.id) input.id = options.id;
if (options.index !== undefined) input.dataset.index = options.index;

input.addEventListener("change", () => {
const nextValue = formatNexusDate(input.value);
control.dataset.value = nextValue;
display.textContent = nextValue || "—";
control.classList.toggle("is-empty", !nextValue);
if (options.onChange) options.onChange(nextValue, input);
});

control.append(display, calendar, input);
return control;
}

function setDateControlValue(control, value) {
if (!control) return;
const formatted = formatNexusDate(value);
const display = control.querySelector(".date-control__value");
const input = control.querySelector(".date-control__native");
control.dataset.value = formatted;
control.classList.toggle("is-empty", !formatted);
if (display) display.textContent = formatted || "—";
if (input) input.value = nexusDateToIso(formatted);
}

function createMemberRoleSelect(value, row, columnIndex) {
return createRoleSelect(value, {
index: columnIndex,
disabled: appState.savingMembers,
label: `Cargo de ${row.values[1] || "membro"}`,
onChange: (nextRole) => {
const draft = memberDraft(row).slice();
draft[columnIndex] = nextRole;
appState.memberDrafts.set(
row.row,
normalizeConsultantValues(draft)
);
renderMembers();
}
});
}

function updateMemberCalculatedReturn(row, draft) {
const indexes = memberFieldIndexes();
const calculatedDraft = applyCalculatedReturnDate(draft, {
clearIncomplete: true
});
appState.memberDrafts.set(row.row, calculatedDraft);

if (indexes.licenseReturn >= 0) {
const tableRow = document.querySelector(
`[data-member-row="${row.row}"]`
);
const returnInput = tableRow?.querySelector(
`.date-control__native[data-index="${indexes.licenseReturn}"]`
);
setDateControlValue(
returnInput?.closest(".date-control"),
calculatedDraft[indexes.licenseReturn]
);
tableRow?.classList.toggle("is-dirty", isMemberRowDirty(row));
}
return calculatedDraft;
}

function createMemberDateControl(value, row, columnIndex) {
const indexes = memberFieldIndexes();
const calculated = columnIndex === indexes.licenseReturn;
return createDateControl(value, {
disabled: appState.savingMembers || calculated,
calculated,
index: columnIndex,
label: `${
appState.headers[columnIndex] || `Campo ${columnIndex + 1}`
} de ${row.values[1] || "membro"}`,
onChange: (nextValue) => {
const draft = memberDraft(row).slice();
draft[columnIndex] = nextValue;
if (columnIndex === indexes.licenseStart) {
updateMemberCalculatedReturn(row, draft);
} else {
appState.memberDrafts.set(row.row, draft);
}
const tableRow = document
.querySelector(`[data-member-row="${row.row}"]`);
if (tableRow) {
tableRow.classList.toggle("is-dirty", isMemberRowDirty(row));
}
}
});
}

function createBooleanToggle(value, row, columnIndex, editable) {
const button = document.createElement("button");
button.className = "boolean-toggle";
button.type = "button";
button.disabled = !editable || appState.savingMembers;
updateBooleanToggle(button, booleanState(value), columnIndex);

if (editable && !appState.savingMembers) {
button.addEventListener("click", () => {
const nextState =
button.dataset.state === "true" ? "false" : "true";
const draft = memberDraft(row).slice();
draft[columnIndex] = nextState.toUpperCase();
appState.memberDrafts.set(row.row, draft);
updateBooleanToggle(button, nextState, columnIndex);
button.closest("tr").classList.toggle(
"is-dirty",
isMemberRowDirty(row)
);
});
}

return button;
}

function createMemberInput(value, row, columnIndex) {
const indexes = memberFieldIndexes();
const input = document.createElement("input");
input.className = "table-input";
input.type = columnIndex === indexes.licenseDays ? "number" : "text";
if (columnIndex === indexes.licenseDays) {
input.min = "0";
input.step = "1";
input.inputMode = "numeric";
}
input.value = value ?? "";
input.disabled = appState.savingMembers;
input.setAttribute(
"aria-label",
appState.headers[columnIndex] || `Campo ${columnIndex + 1}`
);

input.addEventListener("input", () => {
const draft = memberDraft(row).slice();
draft[columnIndex] = input.value;
if (columnIndex === indexes.licenseDays) {
updateMemberCalculatedReturn(row, draft);
} else {
appState.memberDrafts.set(row.row, draft);
}
input.closest("tr").classList.toggle(
"is-dirty",
isMemberRowDirty(row)
);
});

return input;
}

function createMemberSelection(row) {
const checkbox = document.createElement("input");
const label = row.values[1] || row.values[0] || "registro selecionado";
checkbox.className = "member-select";
checkbox.type = "checkbox";
checkbox.checked = appState.selectedMemberRows.has(row.row);
checkbox.disabled = appState.savingMembers;
checkbox.setAttribute("aria-label", `Selecionar ${label}`);
checkbox.addEventListener("change", () => {
if (checkbox.checked) {
appState.selectedMemberRows.add(row.row);
} else {
appState.selectedMemberRows.delete(row.row);
}
updateMemberEditControls();
renderMembers();
});
return checkbox;
}

function renderMembers() {
const table = document.getElementById("members-table");
const head = document.getElementById("members-table-head");
const body = document.getElementById("members-table-body");
const tableState = document.getElementById("table-state");
const resultLabel = document.getElementById("table-result");
const rows = filteredMembers();

head.replaceChildren();
body.replaceChildren();

if (appState.removingMembers) {
const selectionHeader = document.createElement("th");
selectionHeader.scope = "col";
selectionHeader.className = "member-selection-cell";

const selectAll = document.createElement("input");
const selectedVisible = rows.filter((row) =>
appState.selectedMemberRows.has(row.row)
).length;
selectAll.className = "member-select";
selectAll.type = "checkbox";
selectAll.checked = Boolean(rows.length) && selectedVisible === rows.length;
selectAll.indeterminate =
selectedVisible > 0 && selectedVisible < rows.length;
selectAll.disabled = appState.savingMembers || !rows.length;
selectAll.setAttribute("aria-label", "Selecionar registros visíveis");
selectAll.addEventListener("change", () => {
rows.forEach((row) => {
if (selectAll.checked) {
appState.selectedMemberRows.add(row.row);
} else {
appState.selectedMemberRows.delete(row.row);
}
});
updateMemberEditControls();
renderMembers();
});

selectionHeader.appendChild(selectAll);
head.appendChild(selectionHeader);
}

appState.headers.forEach((header, index) => {
const cell = document.createElement("th");
cell.scope = "col";
cell.textContent = header || `Campo ${index + 1}`;
cell.title = cell.textContent;
if (appState.booleanColumns.has(index)) {
cell.classList.add("is-boolean-column");
}
head.appendChild(cell);
});

const indexes = memberFieldIndexes();
rows.forEach((row) => {
const tableRow = document.createElement("tr");
tableRow.dataset.memberRow = row.row;
if (isMemberRowDirty(row)) tableRow.classList.add("is-dirty");
if (appState.selectedMemberRows.has(row.row)) {
tableRow.classList.add("is-selected");
}

if (appState.removingMembers) {
const selectionCell = document.createElement("td");
selectionCell.className = "member-selection-cell";
selectionCell.appendChild(createMemberSelection(row));
tableRow.appendChild(selectionCell);
}

appState.headers.forEach((_, index) => {
const cell = document.createElement("td");
const value = memberDraft(row)[index] ?? "";
const consultant = isConsultantRole(
memberDraft(row)[indexes.role]
);
const consultantField =
consultant &&
index !== indexes.role &&
index !== indexes.nickname;

if (appState.booleanColumns.has(index)) {
cell.classList.add("is-boolean-column");
}

if (consultantField) {
const content = document.createElement("span");
content.className = "table-cell is-empty";
content.textContent = "—";
content.title = "Não se aplica a Consultor(a)";
cell.appendChild(content);
} else if (appState.editingMembers) {
cell.appendChild(
appState.booleanColumns.has(index)
? createBooleanToggle(value, row, index, true)
: index === indexes.role
? createMemberRoleSelect(value, row, index)
: isDateColumn(index)
? createMemberDateControl(value, row, index)
: createMemberInput(value, row, index)
);
} else if (booleanState(value) !== "empty") {
cell.appendChild(createBooleanToggle(value, row, index, false));
} else {
const content = document.createElement("span");
const displayValue =
index === indexes.role
? canonicalRoleName(value)
: isDateColumn(index)
? formatNexusDate(value)
: value;
content.className = "table-cell";
content.textContent = displayValue || "—";
content.title = displayValue;
if (!displayValue) content.classList.add("is-empty");
cell.appendChild(content);
}

tableRow.appendChild(cell);
});

body.appendChild(tableRow);
});

const resultText = appState.search
? `${formatCount(rows.length)} de ${formatCount(appState.rows.length)} registros`
: `${formatCount(rows.length)} registros`;
if (appState.editingMembers) {
resultLabel.textContent = `${resultText} · edição ativa`;
} else if (appState.removingMembers) {
resultLabel.textContent = `${resultText} · ${formatCount(
appState.selectedMemberRows.size
)} selecionado${
appState.selectedMemberRows.size === 1 ? "" : "s"
}`;
} else {
resultLabel.textContent = resultText;
}

if (!rows.length) {
table.hidden = true;
tableState.hidden = false;
tableState.textContent = appState.search
? "Nenhum membro corresponde à busca."
: "Nenhum registro foi encontrado.";
} else {
tableState.hidden = true;
table.hidden = false;
}
}

function updateMemberEditControls() {
const editButton = document.getElementById("edit-members");
const saveButton = document.getElementById("save-members-edit");
const cancelEditButton = document.getElementById("cancel-members-edit");
const addButton = document.getElementById("add-member");
const requirementsButton = document.getElementById("open-requirements");
const publishingButton = document.getElementById("open-publishing");
const organizeButton = document.getElementById("organize-members");
const removeButton = document.getElementById("remove-members");
const confirmRemoveButton = document.getElementById(
"confirm-members-remove"
);
const cancelRemoveButton = document.getElementById(
"cancel-members-remove"
);
const isEditing = appState.editingMembers;
const isRemoving = appState.removingMembers;
const canEdit = canCurrentUserEdit();
const isBusy =
appState.loading ||
appState.savingMembers ||
appState.addingMember ||
appState.requirementsBusy ||
appState.publishingBusy;

editButton.hidden = !canEdit || isEditing || isRemoving;
addButton.hidden = !canEdit || isEditing || isRemoving;
requirementsButton.hidden = !canEdit || isEditing || isRemoving;
publishingButton.hidden = !canEdit || isEditing || isRemoving;
organizeButton.hidden = !canEdit || isEditing || isRemoving;
removeButton.hidden = !canEdit || isEditing || isRemoving;
saveButton.hidden = !canEdit || !isEditing;
cancelEditButton.hidden = !canEdit || !isEditing;
confirmRemoveButton.hidden = !canEdit || !isRemoving;
cancelRemoveButton.hidden = !canEdit || !isRemoving;

editButton.disabled = !canEdit || isBusy || !appState.loaded;
addButton.disabled = !canEdit || isBusy || !appState.loaded;
requirementsButton.disabled =
!canEdit ||
isBusy ||
!appState.loaded ||
!hasRequirementConfiguration();
publishingButton.disabled =
!canEdit || isBusy || !appState.loaded || !hasPublishingData();
organizeButton.disabled =
!canEdit || isBusy || !appState.loaded || !appState.rows.length;
removeButton.disabled =
!canEdit || isBusy || !appState.loaded || !appState.rows.length;
saveButton.disabled = !canEdit || appState.savingMembers;
cancelEditButton.disabled = appState.savingMembers;
confirmRemoveButton.disabled =
appState.savingMembers || !appState.selectedMemberRows.size;
cancelRemoveButton.disabled = appState.savingMembers;
const organizeLabel = appState.organizingMembers
? "Organizando lista"
: "Organizar lista";
organizeButton.setAttribute("aria-label", organizeLabel);
organizeButton.title = organizeLabel;
organizeButton.classList.toggle(
"is-loading",
appState.organizingMembers
);

const saveLabel = appState.savingMembers
? "Salvando alterações"
: "Salvar alterações";
saveButton.setAttribute("aria-label", saveLabel);
saveButton.title = saveLabel;
saveButton.classList.toggle(
"is-loading",
appState.savingMembers && isEditing
);

const removeCount = appState.selectedMemberRows.size;
const confirmRemoveLabel = appState.savingMembers
? "Removendo membros"
: removeCount
? `Remover ${formatCount(removeCount)} selecionado${
removeCount === 1 ? "" : "s"
}`
: "Remover selecionados";
confirmRemoveButton.setAttribute("aria-label", confirmRemoveLabel);
confirmRemoveButton.title = confirmRemoveLabel;
confirmRemoveButton.classList.toggle(
"is-loading",
appState.savingMembers && isRemoving
);

document.getElementById("refresh-members").disabled =
isBusy || isEditing || isRemoving;
}

function beginMemberEditing() {
if (!requireEditAccess()) return;
if (
!appState.loaded ||
appState.editingMembers ||
appState.removingMembers ||
appState.addingMember
) {
return;
}

appState.memberDrafts = new Map(
appState.rows.map((row) => [
row.row,
applyCalculatedReturnDate(memberEditableValues(row))
])
);
appState.booleanColumns = detectBooleanColumns();
appState.editingMembers = true;
setWorkspaceState("", "Editando");
updateMemberEditControls();
renderMembers();
}

function cancelMemberEditing() {
if (appState.savingMembers) return;

appState.editingMembers = false;
appState.memberDrafts.clear();
setWorkspaceState("ready", "Sincronizado");
updateMemberEditControls();
renderMembers();
}

async function organizeMemberList() {
if (!requireEditAccess()) return;
if (
!appState.loaded ||
!appState.rows.length ||
appState.loading ||
appState.savingMembers ||
appState.editingMembers ||
appState.removingMembers ||
appState.addingMember
) {
return;
}

appState.savingMembers = true;
appState.organizingMembers = true;
setWorkspaceState("", "Organizando");
updateMemberEditControls();
renderMembers();

try {
const rows = await persistRosterList(
appState.rows.map((row) => ({
row: row.row,
values: memberEditableValues(row).slice()
}))
);
updateDataTimestamp();
setWorkspaceState("ready", "Sincronizado");
showToast(
`${formatCount(rows.length)} registro${
rows.length === 1 ? "" : "s"
} organizado${rows.length === 1 ? "" : "s"} e atualizado${
rows.length === 1 ? "" : "s"
}.`,
"success"
);
} catch (error) {
setWorkspaceState("error", "Falha ao organizar");
showToast(error.message, "error");
} finally {
appState.savingMembers = false;
appState.organizingMembers = false;
updateMemberEditControls();
renderMembers();
}
}

async function saveMemberList() {
if (!requireEditAccess()) return;
if (!appState.editingMembers || appState.savingMembers) return;

const dirtyCount = appState.rows.filter(isMemberRowDirty).length;

if (!dirtyCount) {
cancelMemberEditing();
showToast("Nenhuma alteração para salvar.", "info");
return;
}

const mergedMembers = appState.rows.map((row) => ({
row: row.row,
values: memberDraft(row).slice()
}));

appState.savingMembers = true;
setWorkspaceState("", "Salvando");
updateMemberEditControls();
renderMembers();

try {
await persistRosterList(mergedMembers);
appState.editingMembers = false;
appState.memberDrafts.clear();
updateDataTimestamp();
setWorkspaceState("ready", "Sincronizado");
showToast(
`${formatCount(dirtyCount)} registro${
dirtyCount === 1 ? "" : "s"
} salvo${dirtyCount === 1 ? "" : "s"}.`,
"success"
);
} catch (error) {
setWorkspaceState("error", "Falha ao salvar");
showToast(error.message, "error");
} finally {
appState.savingMembers = false;
updateMemberEditControls();
renderMembers();
}
}

function createAddBooleanField(label, index) {
const wrapper = document.createElement("div");
wrapper.className = "form-field";
wrapper.dataset.addMemberIndex = String(index);

const buttonId = `add-member-boolean-${index}`;
const fieldLabel = document.createElement("label");
fieldLabel.htmlFor = buttonId;
fieldLabel.textContent = label;

const button = document.createElement("button");
button.id = buttonId;
button.className = "boolean-toggle";
button.type = "button";
button.dataset.addBooleanIndex = String(index);
updateBooleanToggle(button, "false", index);
button.addEventListener("click", () => {
const nextState =
button.dataset.state === "true" ? "false" : "true";
updateBooleanToggle(button, nextState, index);
});

wrapper.append(fieldLabel, button);
return wrapper;
}

function createAddRoleField(label, index) {
const wrapper = document.createElement("div");
wrapper.className = "form-field";
wrapper.dataset.addMemberIndex = String(index);

const fieldLabel = document.createElement("label");
fieldLabel.htmlFor = "add-member-role";
fieldLabel.textContent = label;

const select = createRoleSelect("", {
id: "add-member-role",
index,
className: "form-select",
label,
onChange: updateAddMemberFieldVisibility
});
wrapper.append(fieldLabel, select);
return wrapper;
}

function createAddDateField(label, index) {
const wrapper = document.createElement("div");
wrapper.className = "form-field";
wrapper.dataset.addMemberIndex = String(index);
const indexes = memberFieldIndexes();
const calculated = index === indexes.licenseReturn;

const inputId = `add-member-date-${index}`;
const fieldLabel = document.createElement("label");
fieldLabel.htmlFor = inputId;
fieldLabel.textContent = label;

wrapper.append(
fieldLabel,
createDateControl("", {
id: inputId,
index,
label,
disabled: calculated,
calculated,
onChange:
index === indexes.licenseStart
? updateAddMemberReturnDate
: undefined
})
);
return wrapper;
}

function updateAddMemberReturnDate() {
const indexes = memberFieldIndexes();
if (
indexes.licenseStart < 0 ||
indexes.licenseDays < 0 ||
indexes.licenseReturn < 0
) {
return;
}

const startControl = document
.getElementById(`add-member-date-${indexes.licenseStart}`)
?.closest(".date-control");
const daysInput = document.getElementById(
`add-member-field-${indexes.licenseDays}`
);
const returnControl = document
.getElementById(`add-member-date-${indexes.licenseReturn}`)
?.closest(".date-control");
setDateControlValue(
returnControl,
calculateMemberReturnDate(
startControl?.dataset.value || "",
daysInput?.value || ""
)
);
}

function updateAddMemberFieldVisibility() {
const role = document.getElementById("add-member-role");
if (!role) return;
const indexes = memberFieldIndexes();
const consultant = isConsultantRole(role.value);

document
.querySelectorAll("[data-add-member-index]")
.forEach((field) => {
const index = Number(field.dataset.addMemberIndex);
field.hidden =
consultant &&
index !== indexes.role &&
index !== indexes.nickname;
});

const booleanGroup = document.getElementById(
"add-member-boolean-group"
);
if (booleanGroup) booleanGroup.hidden = consultant;
}

function openAddMemberEditor() {
if (!requireEditAccess()) return;
if (
!appState.loaded ||
appState.editingMembers ||
appState.removingMembers ||
appState.addingMember
) {
return;
}

appState.addingMember = true;
appState.booleanColumns = detectBooleanColumns();
const fields = document.getElementById("add-member-fields");
fields.replaceChildren();
const indexes = memberFieldIndexes();
const booleanGroup = document.createElement("div");
booleanGroup.id = "add-member-boolean-group";
booleanGroup.className = "add-member-boolean-group";

appState.headers.forEach((header, index) => {
const label = header || `Campo ${index + 1}`;
let field;

if (index === indexes.role) {
field = createAddRoleField(label, index);
} else if (appState.booleanColumns.has(index)) {
field = createAddBooleanField(label, index);
} else if (isDateColumn(index)) {
field = createAddDateField(label, index);
} else {
const isDaysField = index === indexes.licenseDays;
field = createFormField(label, "", index, {
id: `add-member-field-${index}`,
placeholder: isDaysField
? "Informe a quantidade de dias"
: "Preencha este campo",
type: isDaysField ? "number" : "text",
min: isDaysField ? 0 : undefined
});
field.dataset.addMemberIndex = String(index);
}

if (appState.booleanColumns.has(index)) {
booleanGroup.appendChild(field);
} else {
fields.appendChild(field);
}
});

if (booleanGroup.childElementCount) {
fields.appendChild(booleanGroup);
}

const daysInput = document.getElementById(
`add-member-field-${indexes.licenseDays}`
);
if (daysInput) {
daysInput.step = "1";
daysInput.inputMode = "numeric";
daysInput.addEventListener("input", updateAddMemberReturnDate);
}

updateAddMemberFieldVisibility();
updateMemberEditControls();
document.getElementById("add-member-editor").showModal();
}

function closeAddMemberEditor() {
if (appState.savingMembers) return;
appState.addingMember = false;
document.getElementById("add-member-editor").close();
updateMemberEditControls();
}

async function saveNewMember(event) {
event.preventDefault();
if (!requireEditAccess()) return;
if (!appState.addingMember || appState.savingMembers) return;

const indexes = memberFieldIndexes();
const values = prepareMemberValues(
appState.headers.map((_, index) => {
if (index === indexes.role) {
return document.getElementById("add-member-role").value;
}
if (appState.booleanColumns.has(index)) {
const button = document.getElementById(
`add-member-boolean-${index}`
);
return button.dataset.state.toUpperCase();
}
if (isDateColumn(index)) {
return document
.getElementById(`add-member-date-${index}`)
.closest(".date-control").dataset.value;
}

return document
.getElementById(`add-member-field-${index}`)
.value.trim();
})
);

if (!values.some((value, index) => value && !appState.booleanColumns.has(index))) {
showToast("Preencha ao menos um campo para adicionar.", "warning");
return;
}

const button = document.getElementById("save-new-member");
appState.savingMembers = true;
button.disabled = true;
button.textContent = "Adicionando…";
updateMemberEditControls();

try {
const mergedMembers = appState.rows
.map((row) => ({ row: row.row, values: memberEditableValues(row).slice() }))
.concat([{ row: null, values }]);
await persistRosterList(mergedMembers);
appState.addingMember = false;
document.getElementById("add-member-editor").close();
renderMembers();
updateDataTimestamp();
setWorkspaceState("ready", "Sincronizado");
showToast("Novo membro adicionado.", "success");
} catch (error) {
showToast(error.message, "error");
} finally {
appState.savingMembers = false;
button.disabled = false;
button.textContent = "Adicionar membro";
updateMemberEditControls();
}
}

function beginMemberRemoval() {
if (!requireEditAccess()) return;
if (
!appState.loaded ||
!appState.rows.length ||
appState.editingMembers ||
appState.removingMembers ||
appState.addingMember
) {
return;
}

appState.removingMembers = true;
appState.selectedMemberRows.clear();
setWorkspaceState("", "Selecionando");
updateMemberEditControls();
renderMembers();
}

function cancelMemberRemoval() {
if (appState.savingMembers) return;
appState.removingMembers = false;
appState.selectedMemberRows.clear();
setWorkspaceState("ready", "Sincronizado");
updateMemberEditControls();
renderMembers();
}

async function confirmMemberRemoval() {
if (!requireEditAccess()) return;
if (
!appState.removingMembers ||
appState.savingMembers ||
!appState.selectedMemberRows.size
) {
return;
}

const selected = new Set(appState.selectedMemberRows);
const removedCount = selected.size;
const remainingMembers = appState.rows
.filter((row) => !selected.has(row.row))
.map((row) => ({ row: row.row, values: memberEditableValues(row).slice() }));
appState.savingMembers = true;
setWorkspaceState("", "Removendo");
updateMemberEditControls();
renderMembers();

try {
await persistRosterList(remainingMembers);
appState.removingMembers = false;
updateDataTimestamp();
setWorkspaceState("ready", "Sincronizado");
showToast(
`${formatCount(removedCount)} membro${
removedCount === 1 ? "" : "s"
} removido${removedCount === 1 ? "" : "s"} da RondList.`,
"success"
);
} catch (error) {
setWorkspaceState("error", "Falha ao remover");
showToast(error.message, "error");
} finally {
appState.savingMembers = false;
updateMemberEditControls();
renderMembers();
}
}

function renderSettings() {
const list = document.getElementById("role-list");
list.replaceChildren();
const roles = appState.settings.filter(
(item) =>
String(item.role || "").trim() ||
String(item.vacancies ?? "").trim()
);
roles.sort((left, right) => {
const rankDifference = roleRank(left.role) - roleRank(right.role);
if (rankDifference) return rankDifference;
return roleOptionIndex(left.role) - roleOptionIndex(right.role);
});

if (!roles.length) {
const empty = document.createElement("p");
empty.className = "role-list__empty";
empty.textContent = "Nenhum cargo configurado.";
list.appendChild(empty);
} else {
roles.forEach((item) => {
const card = document.createElement("article");
card.className = "role-card";

const top = document.createElement("div");
top.className = "role-card__top";

const name = document.createElement("strong");
name.className = "role-card__name";
name.textContent =
canonicalRoleName(item.role) || "Cargo sem nome";
name.title = name.textContent;

const meta = document.createElement("div");
meta.className = "role-card__meta";

const vacancies = document.createElement("span");
vacancies.className = "role-card__vacancies";
vacancies.textContent =
item.vacancies === "" || item.vacancies === null
? "Vagas não definidas"
: `${formatCount(item.vacancies)} vaga${
Number(item.vacancies) === 1 ? "" : "s"
}`;

const editButton = document.createElement("button");
editButton.className = "text-button";
editButton.type = "button";
editButton.textContent = "Editar";
editButton.addEventListener("click", () =>
openSettingsEditor(item.row)
);

top.append(name);
meta.append(vacancies);
if (canCurrentUserEdit()) meta.append(editButton);
card.append(top, meta);
list.appendChild(card);
});
}

renderLayoutResources();
}

function renderAdditionalAccess() {
const container = document.getElementById("additional-access-list");
container.replaceChildren();

if (
!appState.additionalAccess.length &&
!appState.additionalAccessRoles.length
) {
const empty = document.createElement("p");
empty.className = "layout-resources__empty";
empty.textContent = "Nenhum acesso adicional.";
container.appendChild(empty);
return;
}

appState.additionalAccess
.slice()
.sort((left, right) =>
left.localeCompare(right, "pt-BR", { sensitivity: "base" })
)
.forEach((nickname) => {
container.appendChild(
createAdditionalAccessChip(
`Nickname: ${nickname}`,
"nickname",
nickname,
`Acesso explícito de ${nickname}`
)
);
});

appState.additionalAccessRoles
.slice()
.sort((left, right) =>
left.localeCompare(right, "pt-BR", { sensitivity: "base" })
)
.forEach((role) => {
container.appendChild(
createAdditionalAccessChip(
`Cargo: ${role}`,
"cargo",
role,
`Acesso dinâmico para o cargo ${role}`
)
);
});
}

function createAdditionalAccessChip(label, accessType, value, title) {
const chip = document.createElement("span");
chip.className = "additional-access-chip";
chip.title = title;

const text = document.createElement("span");
text.className = "additional-access-chip__text";
text.textContent = label;

const removeButton = document.createElement("button");
removeButton.className = "additional-access-chip__remove";
removeButton.type = "button";
removeButton.innerHTML = '<i class="ti ti-x" aria-hidden="true"></i>';
removeButton.setAttribute("aria-label", `Remover ${label}`);
removeButton.title = `Remover ${label}`;
removeButton.addEventListener("click", () =>
removeAdditionalAccess(accessType, value, removeButton)
);

chip.append(text, removeButton);
return chip;
}

function applyAdditionalAccessState(result) {
appState.additionalAccess = Array.isArray(result.nicknames)
? result.nicknames.slice()
: appState.additionalAccess;
appState.additionalAccessRoles = Array.isArray(result.roles)
? result.roles.slice()
: appState.additionalAccessRoles;
appState.availableAccessRoles = Array.isArray(result.availableRoles)
? result.availableRoles.map((entry) => ({
role: String(entry.role || "")
}))
: appState.availableAccessRoles;
renderAdditionalAccess();
updateAdditionalAccessRoleOptions();
}

async function removeAdditionalAccess(accessType, value, button) {
if (!requireManageAccess()) return;
button.disabled = true;

try {
const response = await requestRondList(
"removeAdditionalAccess",
{ accessType, value }
);
applyAdditionalAccessState(response.additionalAccess || {});
showToast(
`${accessType === "cargo" ? "Cargo" : "Nickname"} removido dos acessos adicionais.`,
"success"
);
revalidateAuthentication().catch(() => {});
} catch (error) {
button.disabled = false;
showToast(error.message, "error");
}
}

function updateAdditionalAccessRoleOptions() {
const select = document.getElementById("additional-access-role");
const previous = select.value;
select.replaceChildren();

const placeholder = document.createElement("option");
placeholder.value = "";
placeholder.textContent = appState.availableAccessRoles.length
? "Selecione um cargo"
: "Nenhum cargo disponível";
select.appendChild(placeholder);

appState.availableAccessRoles.forEach((entry) => {
const option = document.createElement("option");
option.value = entry.role;
option.textContent = entry.role;
select.appendChild(option);
});

if (
Array.from(select.options).some((option) => option.value === previous)
) {
select.value = previous;
}
}

function updateAdditionalAccessField() {
const type = document.getElementById("additional-access-type").value;
const nicknameField = document.getElementById(
"additional-access-nickname-field"
);
const roleField = document.getElementById(
"additional-access-role-field"
);
const input = document.getElementById("additional-access-value");
const roleSelect = document.getElementById("additional-access-role");
const byRole = type === "cargo";
nicknameField.hidden = byRole;
roleField.hidden = !byRole;
input.placeholder = "Informe o nickname";
input.disabled = byRole;
input.required = !byRole;
roleSelect.disabled = !byRole;
roleSelect.required = byRole;
if (byRole) {
roleSelect.focus();
} else {
input.focus();
}
}

async function saveAdditionalAccess(event) {
event.preventDefault();
if (!requireManageAccess()) return;

const accessType = document.getElementById(
"additional-access-type"
).value;
const input = document.getElementById("additional-access-value");
const roleSelect = document.getElementById("additional-access-role");
const value = (accessType === "cargo"
? roleSelect.value
: input.value
).trim();
if (!value) return;

const button = document.getElementById("save-additional-access");
button.disabled = true;
button.textContent = "Adicionando…";

try {
const response = await requestRondList("addAdditionalAccess", {
accessType,
value
});
const result = response.additionalAccess || {};
applyAdditionalAccessState(result);
input.value = "";
roleSelect.value = "";
const addedCount = Array.isArray(result.added)
? result.added.length
: 1;
if (addedCount) {
showToast(
`${result.addedType === "cargo" ? "Cargo" : "Nickname"} adicionado aos acessos adicionais.`,
"success"
);
} else {
showToast("Este acesso adicional já está configurado.", "info");
}
} catch (error) {
showToast(error.message, "error");
} finally {
button.disabled = false;
button.textContent = "Adicionar acesso";
}
}

function getLayoutOwner() {
return (
appState.settings.find(
(item) =>
String(item.banner || "").trim() ||
(item.links || []).some((link) => String(link || "").trim())
) ||
appState.settings[0] ||
null
);
}

function displayHostname(value) {
if (!value) return "Ainda não configurado";
try {
return new URL(value).hostname;
} catch {
return value;
}
}

function createLayoutResource(label, value, meta) {
const card = document.createElement("article");
card.className = "layout-resource";

const labelElement = document.createElement("span");
labelElement.className = "layout-resource__label";
labelElement.textContent = label;

const valueElement = document.createElement("strong");
valueElement.className = "layout-resource__value";
valueElement.textContent = value;
valueElement.title = value;

const metaElement = document.createElement("span");
metaElement.className = "layout-resource__meta";
metaElement.textContent = meta;
metaElement.title = meta;

card.append(labelElement, valueElement, metaElement);
return card;
}

function renderLayoutResources() {
const container = document.getElementById("layout-resources");
const editButton = document.getElementById("edit-layout");
const owner = getLayoutOwner();
container.replaceChildren();
editButton.disabled = appState.loading || !owner;

if (!owner) {
const empty = document.createElement("p");
empty.className = "layout-resources__empty";
empty.textContent = "Nenhuma configuração disponível.";
container.appendChild(empty);
return;
}

const bannerCard = createLayoutResource(
"Banner",
owner.banner ? "Banner configurado" : "Sem banner",
displayHostname(owner.banner)
);

const colors = appState.settings
.map((item, index) => ({
row: item.row,
title:
String(item.colorTitle || "").trim() || `Cor ${index + 1}`,
value: String(item.color || "").trim()
}))
.filter((item) => item.value);
const paletteCard = document.createElement("article");
paletteCard.className = "layout-resource";
const paletteLabel = document.createElement("span");
paletteLabel.className = "layout-resource__label";
paletteLabel.textContent = "Paleta";
const palette = document.createElement("div");
palette.className = "layout-palette";

if (colors.length) {
colors.forEach((color) => {
const swatch = document.createElement("span");
swatch.className = "layout-palette__swatch";
swatch.title = `${color.title} — ${color.value}`;
swatch.setAttribute(
"aria-label",
`${color.title}: ${color.value}`
);
if (
window.CSS &&
CSS.supports("color", color.value)
) {
swatch.style.setProperty("--layout-color", color.value);
} else if (
color.row === 18 &&
window.CSS &&
CSS.supports("box-shadow", color.value)
) {
swatch.style.setProperty("--layout-color", "var(--surface-muted)");
swatch.style.boxShadow = color.value;
}
palette.appendChild(swatch);
});
} else {
const value = document.createElement("strong");
value.className = "layout-resource__value";
value.textContent = "Sem cores";
palette.appendChild(value);
}

const paletteMeta = document.createElement("span");
paletteMeta.className = "layout-resource__meta";
paletteMeta.textContent = colors.length
? `${formatCount(colors.length)} recurso${colors.length === 1 ? "" : "s"} ${colors.length === 1 ? "visual configurado" : "visuais configurados"}`
: "Os recursos serão usados na composição visual";
paletteCard.append(paletteLabel, palette, paletteMeta);

const links = (owner.links || []).filter((link) =>
String(link || "").trim()
);
const topicIds = (owner.topicIds || []).map((topicId) =>
String(topicId || "").trim()
);
const topicsCard = createLayoutResource(
"Tópicos",
topicIds.filter(Boolean).length
? `${formatCount(topicIds.filter(Boolean).length)} IDs configurados`
: "Sem IDs",
`Listagem: ${topicIds[0] || "—"} · Consulta: ${
topicIds[1] || "—"
} · Backup: ${topicIds[2] || "—"}`
);
const linksCard = createLayoutResource(
"Links importantes",
links.length
? `${formatCount(links.length)} link${links.length === 1 ? "" : "s"}`
: "Sem links",
links.length
? links.map(displayHostname).join(" · ")
: "Nenhum link configurado"
);

container.append(bannerCard, paletteCard, topicsCard, linksCard);
}

function updateDataTimestamp(isoDate) {
const target = document.getElementById("data-updated");
const date = isoDate ? new Date(isoDate) : new Date();
target.textContent = `Sincronizado às ${date.toLocaleTimeString("pt-BR", {
hour: "2-digit",
minute: "2-digit"
})}`;
}

function hasRequirementConfiguration() {
const publishing = appState.publishing;
return Boolean(
publishing &&
/^\d+$/.test(String(publishing.requirementsTopicId || "").trim()) &&
/\{TAG\}/i.test(String(publishing.requirementsStampBbcode || ""))
);
}

async function publishRequirementStamp(topicId, bbcode) {
return replyForumTopic(topicId, bbcode, { disableHtml: true });
}

function requirementTagInputs() {
return [1, 2, 3].map((index) =>
document.getElementById(`requirements-tag-${index}`)
);
}

function requirementTagValue() {
return requirementTagInputs()
.map((input) => input.value)
.join("");
}

function updateRequirementStampControls() {
const button = document.getElementById("post-requirements-stamp");
const complete = Array.from(requirementTagValue()).length === 3;
button.disabled =
appState.requirementsBusy ||
!complete ||
!hasRequirementConfiguration();
button.textContent = appState.requirementsBusy
? "Publicando…"
: "Publicar carimbo";
}

function handleRequirementTagInput(event) {
const inputs = requirementTagInputs();
const index = inputs.indexOf(event.currentTarget);
const character =
Array.from(
String(event.currentTarget.value || "")
.replace(/\s/g, "")
)[0] || "";
event.currentTarget.value = character;
if (character && inputs[index + 1]) inputs[index + 1].focus();
updateRequirementStampControls();
}

function handleRequirementTagPaste(event) {
const characters = Array.from(
String(event.clipboardData?.getData("text") || "")
.replace(/\s/g, "")
).slice(0, 3);
if (!characters.length) return;
event.preventDefault();
const inputs = requirementTagInputs();
inputs.forEach((input, index) => {
input.value = characters[index] || "";
});
inputs[Math.min(characters.length, 3) - 1].focus();
updateRequirementStampControls();
}

function handleRequirementTagKeydown(event) {
if (event.key !== "Backspace" || event.currentTarget.value) return;
const inputs = requirementTagInputs();
const index = inputs.indexOf(event.currentTarget);
if (inputs[index - 1]) inputs[index - 1].focus();
}

function openStampDialog() {
if (!requireEditAccess()) return;
if (!hasRequirementConfiguration()) {
showToast(
"Configure o tópico e o modelo do carimbo antes de continuar.",
"warning"
);
return;
}
requirementTagInputs().forEach((input) => {
input.value = "";
});
document.getElementById("requirements-status").textContent =
"Informe a TAG de três caracteres para publicar o carimbo.";
const openLink = document.getElementById("requirements-open-link");
openLink.hidden = true;
openLink.removeAttribute("href");
document.getElementById("requirements-dialog").showModal();
requirementTagInputs()[0].focus();
updateRequirementStampControls();
}

function closeRequirementsDialog() {
if (appState.requirementsBusy) return;
document.getElementById("requirements-dialog").close();
}

function requireTopicId(value, label) {
const topicId = String(value || "").trim();
if (!/^\d+$/.test(topicId)) {
throw new Error(`${label} precisa ter um ID numérico válido.`);
}
return topicId;
}

async function postRequirementsStamp() {
if (!requireEditAccess() || appState.requirementsBusy) return;
const tag = requirementTagValue();
if (Array.from(tag).length !== 3) {
showToast("A TAG deve ter exatamente três caracteres.", "warning");
return;
}

const topicId = requireTopicId(
appState.publishing?.requirementsTopicId,
"O tópico de requerimentos"
);
const bbcode = String(
appState.publishing?.requirementsStampBbcode || ""
).replace(/\{TAG\}/gi, tag);

appState.requirementsBusy = true;
document.getElementById("requirements-status").textContent =
"Publicando carimbo…";
const openLink = document.getElementById("requirements-open-link");
openLink.hidden = true;
openLink.removeAttribute("href");
updateRequirementStampControls();
updateMemberEditControls();

try {
await publishRequirementStamp(topicId, bbcode);
document.getElementById("requirements-status").textContent =
"Carimbo publicado com sucesso. Se quiser conferir, abra a guia do tópico.";
openLink.href = forumTopicUrl(topicId);
openLink.hidden = false;
showToast("Carimbo publicado com sucesso.", "success");
} catch (error) {
document.getElementById("requirements-status").textContent =
error.message;
showToast(error.message, "error");
} finally {
appState.requirementsBusy = false;
updateRequirementStampControls();
updateMemberEditControls();
}
}

function forumTopicUrl(topicId) {
return `${CONFIG.forum.origin}/t${topicId}-`;
}

function parseForumDocument(html) {
return new DOMParser().parseFromString(html, "text/html");
}

function forumLoginRequired(documentNode, responseUrl) {
return (
/\/login(?:\?|$)/i.test(responseUrl || "") ||
Boolean(
documentNode.querySelector(
'form[action*="/login"] input[name="username"]'
)
)
);
}

async function fetchForumDocument(url) {
const response = await fetch(url, {
credentials: "include",
redirect: "follow",
cache: "no-store"
});
const html = await response.text();
const documentNode = parseForumDocument(html);

if (!response.ok) {
throw new Error(`O fórum respondeu com status ${response.status}.`);
}
if (forumLoginRequired(documentNode, response.url)) {
throw new Error("Entre no fórum antes de usar a postagem automática.");
}

return {
document: documentNode,
url: response.url || url
};
}

function findForumPostingForm(documentNode) {
return Array.from(documentNode.forms).find((form) =>
form.querySelector(
'textarea[name="message"], textarea#text_editor_textarea, textarea'
)
);
}

function createForumSubmissionBody(form, textarea, bbcode, options = {}) {
if (options.clearEditReason) {
form
.querySelectorAll('[name="edit_reason"]')
.forEach((control) => control.remove());
}

const body = new FormData(form);
body.set(textarea.name || "message", bbcode);
body.delete("preview");
body.set("post", "Enviar");

if (options.clearEditReason) {
body.delete("edit_reason");
}

if (options.disableHtml) {
const disableHtmlControl = form.querySelector(
'input[name="disable_html"]'
);
body.set(
disableHtmlControl?.name || "disable_html",
disableHtmlControl?.value || "1"
);
}

return body;
}

async function submitForumPostingForm(formUrl, bbcode, options = {}) {
const page = await fetchForumDocument(formUrl);
const form = findForumPostingForm(page.document);
if (!form) {
throw new Error(
"O formulário de postagem não foi encontrado. Verifique sua permissão."
);
}

const textarea = form.querySelector(
'textarea[name="message"], textarea#text_editor_textarea, textarea'
);
const body = createForumSubmissionBody(form, textarea, bbcode, options);

const action = new URL(
form.getAttribute("action") || "/post",
CONFIG.forum.origin
);
if (action.origin !== CONFIG.forum.origin) {
throw new Error("O formulário do fórum apontou para uma origem inesperada.");
}
const response = await fetch(action, {
method: "POST",
credentials: "include",
redirect: "follow",
body
});
const html = await response.text();
const resultDocument = parseForumDocument(html);

if (!response.ok) {
throw new Error(`O fórum recusou o envio com status ${response.status}.`);
}
if (forumLoginRequired(resultDocument, response.url)) {
throw new Error("Sua sessão do fórum expirou. Entre novamente.");
}
if (
/\/post(?:\?|$)/i.test(response.url || "") &&
findForumPostingForm(resultDocument)
) {
const error =
resultDocument.querySelector(
".message-die, .error, .panel .error, .block-error"
)?.textContent || "O fórum não confirmou a publicação.";
throw new Error(error.trim());
}

return response.url;
}

async function replyForumTopic(topicId, bbcode, options = {}) {
const replyUrl = new URL("/post", CONFIG.forum.origin);
replyUrl.searchParams.set("t", topicId);
replyUrl.searchParams.set("mode", "reply");
return submitForumPostingForm(replyUrl, bbcode, options);
}

async function editForumTopic(topicId, bbcode) {
const topic = await fetchForumDocument(forumTopicUrl(topicId));
const editLink = topic.document.querySelector(
'a.btn-edit[href*="mode=editpost"], a[href*="mode=editpost"]'
);

if (!editLink) {
throw new Error(
"O botão de editar não foi encontrado. Confirme o login e a permissão."
);
}

return submitForumPostingForm(
new URL(editLink.getAttribute("href"), CONFIG.forum.origin),
bbcode,
{ clearEditReason: true }
);
}

function createPublishingRequestId() {
if (window.crypto && typeof window.crypto.randomUUID === "function") {
return window.crypto.randomUUID();
}
return `rondlist-${Date.now()}-${Math.random()
.toString(16)
.slice(2)}`;
}

function publishThroughForumBridge(popup, request) {
return new Promise((resolve, reject) => {
const timeout = window.setTimeout(() => {
cleanup();
reject(
new Error(
"A ponte do Forumeiros não respondeu. Instale ou atualize o script RondList-Forumeiros-Bridge.js."
)
);
}, CONFIG.forum.bridgeTimeoutMs);
const interval = window.setInterval(() => {
if (popup.closed) {
cleanup();
reject(new Error("A janela do fórum foi fechada antes do envio."));
return;
}
popup.postMessage(request, CONFIG.forum.origin);
}, 900);

function cleanup() {
window.clearTimeout(timeout);
window.clearInterval(interval);
window.removeEventListener("message", onMessage);
}

function onMessage(event) {
if (
event.origin !== CONFIG.forum.origin ||
event.source !== popup ||
!event.data ||
event.data.type !== "RONDLIST_FORUM_RESULT" ||
event.data.requestId !== request.requestId
) {
return;
}

cleanup();
if (event.data.ok) {
resolve(event.data);
} else {
reject(new Error(event.data.error || "Falha ao publicar no fórum."));
}
}

window.addEventListener("message", onMessage);
popup.postMessage(request, CONFIG.forum.origin);
});
}

function createPublishingTransport(action, windowName) {
const sameForumOrigin =
window.location.origin === CONFIG.forum.origin;
const popup = sameForumOrigin
? null
: window.open(
forumTopicUrl(action.topicId),
windowName
);

if (!sameForumOrigin && !popup) {
showToast(
"Permita a abertura da janela do fórum para continuar.",
"warning"
);
return null;
}

return { sameForumOrigin, popup };
}

function createPublishingResults() {
return {
listing: { status: "idle", message: "Aguardando", url: "" },
consultation: { status: "idle", message: "Aguardando", url: "" },
backup: { status: "idle", message: "Aguardando", url: "" }
};
}

function hasPublishingData() {
const publishing = appState.publishing;
return Boolean(
publishing &&
String(publishing.listingTopicId || "").trim() &&
String(publishing.consultationTopicId || "").trim() &&
String(publishing.backupTopicId || "").trim() &&
String(publishing.listingBbcode || "").trim() &&
String(publishing.consultationBbcode || "").trim()
);
}

function currentRondListDate() {
const parts = new Intl.DateTimeFormat("en-CA", {
timeZone: "America/Fortaleza",
day: "2-digit",
month: "2-digit",
year: "numeric"
})
.formatToParts(new Date())
.reduce((result, part) => {
result[part.type] = part.value;
return result;
}, {});

return `${parts.day} ${NEXUS_MONTHS[Number(parts.month) - 1]} ${
parts.year
}`;
}

function publishingBackupBbcode() {
const consultation = String(
(appState.publishing && appState.publishing.consultationBbcode) || ""
);
return `[spoiler="${currentRondListDate()}"]${consultation}[/spoiler]`;
}

function publishingText(kind) {
if (!appState.publishing) return "";
if (kind === "listing") return appState.publishing.listingBbcode || "";
if (kind === "consultation") {
return appState.publishing.consultationBbcode || "";
}
if (kind === "backup") return publishingBackupBbcode();
return "";
}

function renderPublishingDialog() {
document.getElementById("publish-listing-code").value =
publishingText("listing");
document.getElementById("publish-consultation-code").value =
publishingText("consultation");
document.getElementById("publish-backup-code").value =
publishingText("backup");

document.querySelectorAll("[data-publish-action]").forEach((button) => {
button.disabled = appState.publishingBusy || !hasPublishingData();
});

document.getElementById("publish-all-actions").disabled =
appState.publishingBusy || !hasPublishingData();

Object.entries(appState.publishingResults).forEach(([kind, result]) => {
const card = document.querySelector(`[data-publish-card="${kind}"]`);
const state = document.querySelector(`[data-publish-state="${kind}"]`);
const openLink = document.querySelector(`[data-publish-open="${kind}"]`);
if (!card || !state || !openLink) return;

card.classList.remove(
"is-running",
"is-waiting",
"is-success",
"is-error"
);
if (result.status !== "idle") {
card.classList.add(`is-${result.status}`);
}

state.textContent = result.message || "Aguardando";
openLink.hidden = result.status !== "success" || !result.url;
if (!openLink.hidden) {
openLink.href = result.url;
} else {
openLink.removeAttribute("href");
}
});
}

function resetPublishingResults() {
appState.publishingResults = createPublishingResults();
}

function setPublishingResult(kind, status, message, url = "") {
if (!Object.prototype.hasOwnProperty.call(appState.publishingResults, kind)) {
return;
}

appState.publishingResults[kind] = {
status,
message,
url
};
renderPublishingDialog();
}

function setPublishingMode(mode) {
const manual = mode !== "automatic";
const manualButton = document.getElementById("publish-mode-manual");
const automaticButton = document.getElementById("publish-mode-auto");

manualButton.classList.toggle("is-active", manual);
automaticButton.classList.toggle("is-active", !manual);
manualButton.setAttribute("aria-selected", String(manual));
automaticButton.setAttribute("aria-selected", String(!manual));
document.getElementById("publish-manual-panel").hidden = !manual;
document.getElementById("publish-auto-panel").hidden = manual;
}

async function openPublishingDialog() {
if (!requireEditAccess()) return;

appState.publishingBusy = true;
updateMemberEditControls();
try {
const response = await requestRondList("publishing", null, {
forceRefresh: true
});
if (response.publishing) appState.publishing = response.publishing;
} catch (error) {
showToast(error.message, "error");
} finally {
appState.publishingBusy = false;
updateMemberEditControls();
}

if (!hasPublishingData()) {
showToast(
"Configure os tópicos e os conteúdos de publicação antes de continuar.",
"warning"
);
return;
}

setPublishingMode("manual");
resetPublishingResults();
document.getElementById("publish-status").textContent =
"Selecione uma ação para iniciar.";
renderPublishingDialog();
document.getElementById("publishing-dialog").showModal();
}

function closePublishingDialog() {
if (appState.publishingBusy) {
showToast("Aguarde a publicação em andamento.", "warning");
return;
}
document.getElementById("publishing-dialog").close();
}

async function copyPublishingText(kind) {
const text = publishingText(kind);
if (!text) {
showToast("Não há BBCode disponível para copiar.", "warning");
return;
}

try {
if (navigator.clipboard && window.isSecureContext) {
await navigator.clipboard.writeText(text);
} else {
const field = document.getElementById(`publish-${kind}-code`);
field.focus();
field.select();
if (!document.execCommand("copy")) {
throw new Error("A cópia automática não está disponível.");
}
}
showToast("BBCode copiado.", "success");
} catch (error) {
showToast(error.message, "error");
}
}

function automaticPublishingActions() {
const publishing = appState.publishing;
return {
listing: {
kind: "listing",
label: "Atualização da listagem",
bridgeAction: "edit",
topicId: requireTopicId(
publishing.listingTopicId,
"O tópico da listagem"
),
bbcode: publishingText("listing")
},
consultation: {
kind: "consultation",
label: "Atualização da consulta",
bridgeAction: "edit",
topicId: requireTopicId(
publishing.consultationTopicId,
"O tópico da consulta"
),
bbcode: publishingText("consultation")
},
backup: {
kind: "backup",
label: "Publicação do backup",
bridgeAction: "reply",
topicId: requireTopicId(
publishing.backupTopicId,
"O tópico de backup"
),
bbcode: publishingText("backup")
}
};
}

async function executeAutomaticPublishingAction(action, transport) {
document.getElementById("publish-status").textContent =
`${action.label}: enviando…`;
setPublishingResult(action.kind, "running", "Enviando…", "");

try {
if (transport.sameForumOrigin) {
if (action.bridgeAction === "edit") {
await editForumTopic(action.topicId, action.bbcode);
} else {
await replyForumTopic(action.topicId, action.bbcode);
}
} else {
await publishThroughForumBridge(transport.popup, {
type: "RONDLIST_FORUM_ACTION",
requestId: createPublishingRequestId(),
action: action.bridgeAction,
topicId: action.topicId,
bbcode: action.bbcode
});
}

const topicUrl = forumTopicUrl(action.topicId);
setPublishingResult(
action.kind,
"success",
"Concluído",
topicUrl
);
return topicUrl;
} catch (error) {
setPublishingResult(
action.kind,
"error",
"Falhou",
""
);
throw error;
}
}

function beginPublishing() {
appState.publishingBusy = true;
updateMemberEditControls();
renderPublishingDialog();
}

function finishPublishing() {
appState.publishingBusy = false;
updateMemberEditControls();
renderPublishingDialog();
}

function waitForPublishingDelay(action) {
const seconds = Math.ceil(CONFIG.forum.automaticDelayMs / 1000);
const status = document.getElementById("publish-status");

return new Promise((resolve) => {
let remaining = seconds;
status.textContent = `${action.label} em ${remaining}s…`;
setPublishingResult(
action.kind,
"waiting",
`Em ${remaining} s`,
""
);
const timer = window.setInterval(() => {
remaining -= 1;
if (remaining <= 0) {
window.clearInterval(timer);
resolve();
return;
}
status.textContent = `${action.label} em ${remaining}s…`;
setPublishingResult(
action.kind,
"waiting",
`Em ${remaining} s`,
""
);
}, 1000);
});
}

async function runAutomaticPublishing(kind) {
if (appState.publishingBusy || !hasPublishingData()) return;

const actions = automaticPublishingActions();
const action = actions[kind];
if (!action) return;
const transport = createPublishingTransport(
action,
`rondlist-forum-${action.topicId}`
);
if (!transport) return;

setPublishingResult(kind, "idle", "Aguardando", "");
beginPublishing();

try {
await waitForPublishingDelay(action);
await executeAutomaticPublishingAction(action, transport);
document.getElementById("publish-status").textContent =
`${action.label} concluída.`;
showToast(`${action.label} concluída no fórum.`, "success");
} catch (error) {
document.getElementById("publish-status").textContent = error.message;
showToast(error.message, "error");
} finally {
finishPublishing();
}
}

async function runAutomaticPublishingSequence() {
if (appState.publishingBusy || !hasPublishingData()) return;

const actions = automaticPublishingActions();
const sequence = [
actions.listing,
actions.consultation,
actions.backup
];
const transport = createPublishingTransport(
sequence[0],
"rondlist-forum-sequence"
);
if (!transport) return;

resetPublishingResults();
beginPublishing();

try {
for (let index = 0; index < sequence.length; index += 1) {
const action = sequence[index];
if (index > 0) {
await waitForPublishingDelay(action);
}
await executeAutomaticPublishingAction(action, transport);
}

document.getElementById("publish-status").textContent =
"Atualização completa concluída.";
showToast(
"Listagem, consulta e backup atualizados no fórum.",
"success"
);
} catch (error) {
document.getElementById("publish-status").textContent = error.message;
showToast(error.message, "error");
} finally {
finishPublishing();
}
}

async function loadRondList(options = {}) {
const { quiet = false, force = false } = options;
setDataLoading(true);
setWorkspaceState("", "Sincronizando");

if (!appState.loaded) {
const table = document.getElementById("members-table");
const tableState = document.getElementById("table-state");
table.hidden = true;
tableState.hidden = false;
tableState.textContent = "Carregando a base de membros…";
}

try {
const response = await requestRondList(
"bootstrap",
null,
force ? { forceRefresh: true } : {}
);
const incomingRows = response.data.rows || [];
appState.headers = response.data.headers || [];
appState.maxDataRow = incomingRows.reduce(
(maximum, row) => Math.max(maximum, Number(row.row) || 1),
1
);
const roleIndex = memberFieldIndexes().role;
appState.rows = incomingRows.map((row) => {
const values = Array.isArray(row.values) ? row.values.slice() : [];
if (roleIndex >= 0) {
values[roleIndex] = canonicalRoleName(values[roleIndex]);
}
return { row: row.row, values };
});
appState.settings = (response.settings.rows || []).map((item) => ({
...item,
role: canonicalRoleName(item.role)
}));
appState.additionalAccess = Array.isArray(
response.additionalAccess && response.additionalAccess.nicknames
)
? response.additionalAccess.nicknames.slice()
: [];
appState.additionalAccessRoles = Array.isArray(
response.additionalAccess && response.additionalAccess.roles
)
? response.additionalAccess.roles.slice()
: [];
appState.availableAccessRoles = Array.isArray(
response.additionalAccess &&
response.additionalAccess.availableRoles
)
? response.additionalAccess.availableRoles.map((entry) => ({
role: String(entry.role || "")
}))
: [];
appState.publishing = response.publishing || null;
appState.booleanColumns = detectBooleanColumns();
sortMembers();
appState.selectedMemberRows.clear();
appState.loaded = true;

renderMembers();
renderSettings();
renderAdditionalAccess();
updateAdditionalAccessRoleOptions();
document.getElementById("data-origin").textContent = force
? "Dados recarregados"
: "Dados sincronizados";
updateDataTimestamp(response.meta && response.meta.generatedAt);
setWorkspaceState("ready", "Sincronizado");

if (!quiet) {
showToast(
force
? `${formatCount(appState.rows.length)} registros recarregados.`
: `${formatCount(appState.rows.length)} registros atualizados.`,
"success"
);
}
} catch (error) {
setWorkspaceState("error", "Conexão pendente");
document.getElementById("members-table").hidden = true;
const tableState = document.getElementById("table-state");
tableState.hidden = false;
tableState.textContent = error.message;
document.getElementById("table-result").textContent =
"Não foi possível carregar";
showToast(error.message, "error");
} finally {
setDataLoading(false);
}
}

function createFormField(label, value, index, options = {}) {
const wrapper = document.createElement("div");
wrapper.className = `form-field${options.wide ? " form-field--wide" : ""}`;

const inputId =
options.id || `${options.prefix || "field"}-${index}`;
const fieldLabel = document.createElement("label");
fieldLabel.htmlFor = inputId;
fieldLabel.textContent = label;

const input = document.createElement("input");
input.id = inputId;
input.name = inputId;
input.type = options.type || "text";
input.value = value ?? "";
input.dataset.index = index;
if (options.placeholder) input.placeholder = options.placeholder;
if (options.min !== undefined) input.min = options.min;
if (options.dataset) {
Object.entries(options.dataset).forEach(([key, datasetValue]) => {
input.dataset[key] = datasetValue;
});
}

wrapper.append(fieldLabel, input);
return wrapper;
}

function openSettingsEditor(rowNumber) {
if (!requireEditAccess()) return;
const item = appState.settings.find((entry) => entry.row === rowNumber);
if (!item) return;

appState.editingSettingsRow = rowNumber;
document.getElementById("settings-editor-eyebrow").textContent =
"Configuração do cargo";
const fields = document.getElementById("settings-editor-fields");
fields.replaceChildren();

const roleField = document.createElement("div");
roleField.className = "form-field";
const roleLabel = document.createElement("label");
roleLabel.htmlFor = "settings-field-0";
roleLabel.textContent = "Cargo";
roleField.append(
roleLabel,
createRoleSelect(item.role, {
id: "settings-field-0",
index: 0,
className: "form-select",
label: "Cargo"
})
);

const vacanciesField = createFormField(
"Quantidade de vagas",
item.vacancies,
1,
{
id: "settings-field-1",
type: "number",
placeholder: "0",
min: 0
}
);
fields.append(roleField, vacanciesField);

document.getElementById("settings-editor").showModal();
}

function closeSettingsEditor() {
appState.editingSettingsRow = null;
document.getElementById("settings-editor").close();
}

async function saveRoleSettings(event) {
event.preventDefault();
if (!requireEditAccess()) return;
const item = appState.settings.find(
(entry) => entry.row === appState.editingSettingsRow
);
if (!item) return;

const button = document.getElementById("save-settings");
const inputs = Array.from(
document.querySelectorAll(
"#settings-editor-fields input, #settings-editor-fields select"
)
).sort((left, right) => Number(left.dataset.index) - Number(right.dataset.index));
const values = inputs.map((input) => input.value.trim());

button.disabled = true;
button.textContent = "Salvando…";

try {
await requestRondList("saveSettings", {
rows: [
{
row: item.row,
role: values[0],
vacancies: values[1]
}
]
});

item.role = values[0];
item.vacancies = values[1] === "" ? "" : Number(values[1]);
closeSettingsEditor();
renderSettings();
updateDataTimestamp();
showToast("Cargo e vagas atualizados.", "success");
} catch (error) {
showToast(error.message, "error");
} finally {
button.disabled = false;
button.textContent = "Salvar cargo";
}
}

function createEditorFieldset(title, description) {
const section = document.createElement("section");
section.className = "editor-fieldset";

const heading = document.createElement("h3");
heading.className = "editor-fieldset__title";
heading.textContent = title;

const copy = document.createElement("p");
copy.className = "editor-fieldset__description";
copy.textContent = description;

const grid = document.createElement("div");
grid.className = "editor-grid";
section.append(heading, copy, grid);
return { section, grid };
}

function normalizeLayoutStyleValue(value) {
return String(value || "").trim();
}

function validPreviewStyleValue(value, property) {
if (!value || !window.CSS || typeof CSS.supports !== "function") {
return false;
}
return property === "--directory-shadow"
? CSS.supports("box-shadow", value)
: CSS.supports("color", value);
}

function previewTextColor(value) {
let hex = String(value || "").replace("#", "");
if (hex.length === 3 || hex.length === 4) {
hex = hex
.slice(0, 3)
.split("")
.map((digit) => digit + digit)
.join("");
} else {
hex = hex.slice(0, 6);
}

if (!/^[0-9A-F]{6}$/i.test(hex)) return "#FFFFFF";
const channels = [0, 2, 4].map((offset) =>
parseInt(hex.slice(offset, offset + 2), 16)
);
const luminance =
(channels[0] * 299 + channels[1] * 587 + channels[2] * 114) /
255000;
return luminance > 0.62 ? "#171717" : "#FFFFFF";
}

function updateLayoutBannerPreview() {
const input = document.getElementById("layout-banner");
const image = document.getElementById("layout-preview-banner");
const placeholder = document.getElementById(
"layout-preview-banner-placeholder"
);
if (!input || !image || !placeholder) return;

const value = input.value.trim();
image.hidden = true;
placeholder.hidden = false;

if (!value) {
image.removeAttribute("src");
image.dataset.previewSource = "";
placeholder.textContent =
"Adicione o link do banner para visualizá-lo.";
return;
}

let source;
try {
const parsed = new URL(value);
if (!["http:", "https:"].includes(parsed.protocol)) {
throw new Error("Protocolo inválido");
}
source = parsed.toString();
} catch {
image.removeAttribute("src");
image.dataset.previewSource = "";
placeholder.textContent = "Insira um link válido para o banner.";
return;
}

placeholder.textContent = "Carregando banner…";
image.dataset.previewSource = source;
image.onload = () => {
if (image.dataset.previewSource !== source) return;
image.hidden = false;
placeholder.hidden = true;
};
image.onerror = () => {
if (image.dataset.previewSource !== source) return;
image.hidden = true;
placeholder.hidden = false;
placeholder.textContent = "Não foi possível carregar este banner.";
};

if (image.src !== source) {
image.src = source;
} else if (image.complete) {
if (image.naturalWidth) {
image.hidden = false;
placeholder.hidden = true;
} else {
placeholder.textContent = "Não foi possível carregar este banner.";
}
}
}

function updateLayoutColorPreview() {
const canvas = document.getElementById("layout-preview-canvas");
const palette = document.getElementById("layout-preview-palette");
if (!canvas || !palette) return;

const definitions = [
{ property: "--directory-purple", label: "Roxo principal", fallback: "#821f88" },
{ property: "--directory-purple-dark", label: "Roxo escuro", fallback: "#57125b" },
{ property: "--directory-purple-deep", label: "Roxo profundo", fallback: "#500b59" },
{ property: "--directory-purple-bright", label: "Roxo brilhante", fallback: "#a22ca9" },
{ property: "--directory-purple-role", label: "Roxo dos cargos", fallback: "#8a188c" },
{ property: "--directory-lilac", label: "Lilás", fallback: "#dacbdb" },
{ property: "--directory-lilac-soft", label: "Lilás suave", fallback: "#f0f0f0" },
{ property: "--directory-lilac-muted", label: "Lilás secundário", fallback: "#c8b9c9" },
{ property: "--directory-ink", label: "Texto", fallback: "#352838" },
{ property: "--directory-white", label: "Branco", fallback: "#ffffff" },
{ property: "--directory-green", label: "WhatsApp", fallback: "#1ca14e" },
{ property: "--directory-discord", label: "Discord", fallback: "#5865f2" },
{ property: "--directory-project", label: "Projeto aprovado", fallback: "#da70d6" },
{ property: "--directory-pending", label: "Graduação pendente", fallback: "#b38171" },
{ property: "--directory-danger", label: "Perigo", fallback: "#b83243" },
{ property: "--directory-danger-soft", label: "Perigo suave", fallback: "rgba(184, 50, 67, 0.18)" },
{ property: "--directory-shadow", label: "Sombra", fallback: "0 2px 5px rgba(20, 0, 0, 0.14)" }
];
const titles = new Map(
Array.from(
document.querySelectorAll("[data-layout-color-title-row]")
).map((input) => [
Number(input.dataset.layoutColorTitleRow),
input.value.trim()
])
);
const entries = Array.from(
document.querySelectorAll("[data-layout-color-row]")
)
.map((input) => {
const row = Number(input.dataset.layoutColorRow);
const definition = definitions[row - 2];
if (!definition) return null;
const value = normalizeLayoutStyleValue(input.value);
return {
...definition,
row,
title: titles.get(row) || definition.label,
value,
valid: validPreviewStyleValue(value, definition.property)
};
})
.filter(Boolean)
.sort((left, right) => left.row - right.row);

definitions.forEach((definition) => {
const entry = entries.find(
(item) => item.property === definition.property
);
canvas.style.setProperty(
definition.property,
entry && entry.valid ? entry.value : definition.fallback
);
});

palette.replaceChildren();
entries.forEach((entry) => {
const item = document.createElement("div");
item.className = `bbcode-preview-color${
entry.value && !entry.valid ? " is-invalid" : ""
}`;
const displayedValue = entry.valid ? entry.value : entry.fallback;
if (entry.property === "--directory-shadow") {
item.style.setProperty("--preview-swatch", "var(--surface-muted)");
item.style.boxShadow = displayedValue;
item.style.setProperty("--preview-chip-text", "var(--text)");
} else {
item.style.setProperty("--preview-swatch", displayedValue);
item.style.setProperty(
"--preview-chip-text",
previewTextColor(displayedValue)
);
}
item.textContent = entry.title;
item.title = entry.valid
? `${entry.title}: ${entry.value}`
: `${entry.title}: ${
entry.value ? "valor inválido" : "usando o padrão"
}`;
palette.appendChild(item);
});
}

function updateLayoutLivePreview() {
updateLayoutBannerPreview();
updateLayoutColorPreview();
}

function openLayoutEditor() {
if (!requireEditAccess()) return;
const owner = getLayoutOwner();
if (!owner) return;

appState.editingLayoutOwnerRow = owner.row;
const fields = document.getElementById("layout-editor-fields");
fields.replaceChildren();

const bannerGroup = createEditorFieldset(
"Banner",
"Imagem principal que será usada no topo da futura listagem em BBCode."
);
bannerGroup.grid.appendChild(
createFormField("URL do banner", owner.banner, 0, {
id: "layout-banner",
type: "url",
placeholder: "https://...",
wide: true
})
);

const colorGroup = createEditorFieldset(
"Paleta de cores",
"Defina os valores visuais na mesma ordem usada pela listagem."
);
appState.settings.forEach((item, index) => {
colorGroup.grid.appendChild(
createFormField(
`Título da cor ${index + 1}`,
item.colorTitle,
index,
{
id: `layout-color-title-${item.row}`,
placeholder: `Cor ${index + 1}`,
dataset: { layoutColorTitleRow: String(item.row) }
}
)
);
colorGroup.grid.appendChild(
createFormField(
`Valor de ${String(item.colorTitle || "").trim() || `cor ${index + 1}`}`,
item.color,
index,
{
id: `layout-color-${item.row}`,
placeholder:
item.row === 18
? "0 2px 5px rgba(20, 0, 0, .14)"
: "#821F88 ou rgba(...)",
dataset: { layoutColorRow: String(item.row) }
}
)
);
});

const topicsGroup = createEditorFieldset(
"Tópicos de publicação",
"Informe os IDs numéricos dos tópicos usados na publicação."
);
["Listagem", "Consulta", "Backup"].forEach((label, index) => {
topicsGroup.grid.appendChild(
createFormField(
label,
(owner.topicIds || [])[index] || "",
index,
{
id: `layout-topic-${index}`,
type: "text",
placeholder: "1"
}
)
);
});

const linksGroup = createEditorFieldset(
"Links importantes",
"Links complementares usados na composição do BBCode."
);
Array.from({ length: 2 }, (_, index) => {
linksGroup.grid.appendChild(
createFormField(
`Link importante ${index + 1}`,
(owner.links || [])[index] || "",
index,
{
id: `layout-link-${index}`,
type: "url",
placeholder: "https://...",
wide: true
}
)
);
});

fields.append(
bannerGroup.section,
colorGroup.section,
topicsGroup.section,
linksGroup.section
);
document
.getElementById("layout-banner")
.addEventListener("input", updateLayoutBannerPreview);
fields
.querySelectorAll(
"[data-layout-color-row], [data-layout-color-title-row]"
)
.forEach((input) =>
input.addEventListener("input", updateLayoutColorPreview)
);
updateLayoutLivePreview();
document.getElementById("layout-editor").showModal();
}

function closeLayoutEditor() {
appState.editingLayoutOwnerRow = null;
document.getElementById("layout-editor").close();
}

async function saveLayoutSettings(event) {
event.preventDefault();
if (!requireEditAccess()) return;
const owner = appState.settings.find(
(item) => item.row === appState.editingLayoutOwnerRow
);
if (!owner) return;

const banner = document.getElementById("layout-banner").value.trim();
const topicIds = Array.from({ length: 3 }, (_, index) =>
document.getElementById(`layout-topic-${index}`).value.trim()
);
const links = Array.from({ length: 2 }, (_, index) =>
document.getElementById(`layout-link-${index}`).value.trim()
);
const colors = new Map(
Array.from(
document.querySelectorAll("[data-layout-color-row]")
).map((input) => [
Number(input.dataset.layoutColorRow),
normalizeLayoutStyleValue(input.value)
])
);
const colorTitles = new Map(
Array.from(
document.querySelectorAll("[data-layout-color-title-row]")
).map((input) => [
Number(input.dataset.layoutColorTitleRow),
input.value.trim()
])
);
const updates = new Map();

function mergeUpdate(row, fields) {
updates.set(row, { ...(updates.get(row) || { row }), ...fields });
}

if (
banner !== String(owner.banner || "").trim() ||
topicIds.some(
(topicId, index) =>
topicId !== String((owner.topicIds || [])[index] || "").trim()
) ||
links.some(
(link, index) =>
link !== String((owner.links || [])[index] || "").trim()
)
) {
mergeUpdate(owner.row, { banner, topicIds, links });
}

appState.settings.forEach((item) => {
const color = colors.get(item.row) || "";
const colorTitle = colorTitles.get(item.row) || "";
const colorChanged =
color !== normalizeLayoutStyleValue(item.color);
const titleChanged =
colorTitle !== String(item.colorTitle || "").trim();
if (colorChanged || titleChanged) {
mergeUpdate(item.row, { color, colorTitle });
}
});

if (!updates.size) {
closeLayoutEditor();
showToast("Nenhuma alteração nos recursos do BBCode.", "info");
return;
}

const button = document.getElementById("save-layout");
button.disabled = true;
button.textContent = "Salvando…";

try {
const rows = Array.from(updates.values());
await requestRondList("saveSettings", { rows });

rows.forEach((update) => {
const item = appState.settings.find(
(entry) => entry.row === update.row
);
if (!item) return;
if (Object.prototype.hasOwnProperty.call(update, "banner")) {
item.banner = update.banner;
}
if (Object.prototype.hasOwnProperty.call(update, "color")) {
item.color = update.color;
}
if (Object.prototype.hasOwnProperty.call(update, "colorTitle")) {
item.colorTitle = update.colorTitle;
}
if (Object.prototype.hasOwnProperty.call(update, "topicIds")) {
item.topicIds = update.topicIds.slice();
if (appState.publishing) {
appState.publishing.listingTopicId = update.topicIds[0] || "";
appState.publishing.consultationTopicId =
update.topicIds[1] || "";
appState.publishing.backupTopicId = update.topicIds[2] || "";
}
}
if (Object.prototype.hasOwnProperty.call(update, "links")) {
item.links = update.links.slice();
}
});

closeLayoutEditor();
renderSettings();
updateDataTimestamp();
showToast("Recursos do BBCode atualizados.", "success");
} catch (error) {
showToast(error.message, "error");
} finally {
button.disabled = false;
button.textContent = "Salvar recursos";
}
}

function cleanCell(value) {
return String(value || "").replace(/^"|"$/g, "").trim();
}

async function fetchForumUsername() {
const runtimeUsername = cleanCell(
window._userdata && window._userdata.username
);
if (
runtimeUsername &&
runtimeUsername.toLocaleLowerCase("pt-BR") !== "anônimo"
) {
return runtimeUsername;
}

let response;

try {
response = await fetch(`${CONFIG.forum.origin}/`, {
method: "GET",
credentials: "include",
redirect: "follow",
cache: "no-store"
});
} catch {
throw new Error("Não foi possível consultar sua sessão no fórum.");
}

if (!response.ok) {
throw new Error("Não foi possível confirmar seu login no fórum.");
}

const forumHtml = await response.text();

if (forumLoginRequired(parseForumDocument(forumHtml), response.url)) {
const error = new Error(
"Você precisa estar conectado ao fórum para continuar."
);
error.code = "AUTH_DENIED";
throw error;
}

const match = forumHtml.match(
/_userdata\[['"]username['"]\]\s*=\s*['"]([^'"]+)['"]/i
);
const username = match ? cleanCell(match[1]) : "";

if (!username || username.toLocaleLowerCase("pt-BR") === "anônimo") {
const error = new Error(
"Você precisa estar conectado ao fórum para continuar."
);
error.code = "AUTH_DENIED";
throw error;
}

return username;
}

function denyAccess(message) {
const authScreen = document.getElementById("auth-screen");
currentUser = null;
if (authRevalidationTimer) {
window.clearInterval(authRevalidationTimer);
authRevalidationTimer = null;
}
authScreen.hidden = false;
authScreen.classList.remove("is-hidden");
authScreen.classList.add("is-denied");
document.getElementById("auth-title").textContent = "Acesso negado";
document.getElementById("auth-message").textContent = message;
authScreen.setAttribute("role", "alert");
document.getElementById("topbar-user").classList.remove("is-visible");
applyAccessMode();
}

function allowAccess(user, options = {}) {
currentUser = Object.freeze({ ...user });

const authScreen = document.getElementById("auth-screen");
const userBlock = document.getElementById("topbar-user");
const avatar = document.getElementById("user-avatar");

document.getElementById("user-display-name").textContent = user.nick;
document.getElementById("user-display-role").textContent =
options.pendingValidation
? `${user.role} · verificando acesso`
: canCurrentUserEdit(user)
? user.role
: `${user.role} · somente leitura`;
avatar.src =
`https://www.habbo.com.br/habbo-imaging/avatarimage?user=${encodeURIComponent(user.nick)}` +
"&direction=2&head_direction=3&gesture=sml&size=m&headonly=1";
avatar.alt = `Avatar de ${user.nick}`;
userBlock.classList.add("is-visible");
authScreen.classList.add("is-hidden");
applyAccessMode();

window.setTimeout(() => {
authScreen.hidden = true;
}, 250);
}

function userFromAccess(access, username) {
return {
nick: access.nick || username,
role: canonicalRoleName(access.role) || "Acesso autorizado",
roles: Array.isArray(access.roles)
? access.roles.map(canonicalRoleName)
: [],
canEdit:
typeof access.canEdit === "boolean"
? access.canEdit
: undefined,
canManageAccess:
typeof access.canManageAccess === "boolean"
? access.canManageAccess
: undefined
};
}

async function validateForumAccess() {
const username = await fetchForumUsername();
const response = await requestRondList("access", { username });
const access = response.access || {};

if (!access.allowed) {
const error = new Error(
access.message ||
"Seu usuário não possui permissão para acessar a RondList."
);
error.code = "AUTH_DENIED";
throw error;
}

return userFromAccess(access, username);
}

function scheduleAuthenticationRevalidation() {
if (authRevalidationTimer) {
window.clearInterval(authRevalidationTimer);
}
authRevalidationTimer = window.setInterval(() => {
revalidateAuthentication().catch(() => {});
}, CONFIG.auth.revalidateIntervalMs);
}

async function revalidateAuthentication(options = {}) {
try {
const user = await validateForumAccess();
allowAccess(user);
await saveCachedAuthentication(user);
scheduleAuthenticationRevalidation();

if (options.reloadData) {
await loadRondList({ quiet: true, force: true });
}
if (
options.honorInitialHash &&
window.location.hash === "#configuracoes" &&
canCurrentUserEdit(user)
) {
navigateToView("settings", { force: true });
}
if (options.announce) {
showToast("", "success", `Bem-vindo, ${user.nick}`);
}
return user;
} catch (error) {
if (currentUser && error && error.code !== "AUTH_DENIED") {
allowAccess(
{ ...currentUser, canEdit: false, canManageAccess: false },
{ pendingValidation: true }
);
scheduleAuthenticationRevalidation();
return null;
}
await clearCachedAuthentication();
denyAccess(
error && error.message
? error.message
: "Não foi possível validar seu acesso."
);
throw error;
}
}

async function initializeAuthentication() {
const authScreen = document.getElementById("auth-screen");
authScreen.hidden = false;
authScreen.classList.remove("is-hidden", "is-denied");
authScreen.setAttribute("role", "status");
document.getElementById("auth-title").textContent = "Verificando acesso";
document.getElementById("auth-message").textContent =
"Aguarde enquanto validamos seu login e sua permissão na RondList.";

const cached = await readCachedAuthentication();
if (cached && cached.user && cached.user.nick) {
allowAccess(
{ ...cached.user, canEdit: false, canManageAccess: false },
{ pendingValidation: true }
);
loadRondList({ quiet: true, force: true }).catch(() => {});
revalidateAuthentication({
reloadData: true,
honorInitialHash: true
}).catch(() => {});
return;
}

revalidateAuthentication({
reloadData: true,
honorInitialHash: true,
announce: true
}).catch(() => {});
}

function showToast(message, type = "info", title = "") {
const styles = {
success: {
title: "Sucesso",
icon: `
<i class="ti ti-circle-check" aria-hidden="true"></i>
`
},
error: {
title: "Erro",
icon: `
<i class="ti ti-circle-x" aria-hidden="true"></i>
`
},
warning: {
title: "Atenção",
icon: `
<i class="ti ti-alert-triangle" aria-hidden="true"></i>
`
},
info: {
title: "Informação",
icon: `
<i class="ti ti-info-circle" aria-hidden="true"></i>
`
}
};

const style = styles[type] || styles.info;
const toast = document.createElement("div");
toast.className = "toast";
toast.dataset.type = styles[type] ? type : "info";
toast.setAttribute("role", type === "error" ? "alert" : "status");

const toastIcon = document.createElement("span");
toastIcon.className = "toast__icon";
toastIcon.innerHTML = style.icon;

const toastContent = document.createElement("span");
toastContent.className = "toast__content";
const toastTitle = document.createElement("strong");
toastTitle.className = "toast__title";
toastTitle.textContent = title || style.title;
toastContent.appendChild(toastTitle);

if (message) {
const toastMessage = document.createElement("span");
toastMessage.className = "toast__message";
toastMessage.textContent = message;
toastContent.appendChild(toastMessage);
}

toast.append(toastIcon, toastContent);
document.getElementById("toast-container").appendChild(toast);

requestAnimationFrame(() => {
toast.classList.add("is-visible");
window.setTimeout(() => toast.classList.add("is-expanded"), 420);
});

const duration = type === "error" ? 5400 : 4700;
window.setTimeout(() => {
toast.classList.remove("is-expanded");
}, duration - 850);

window.setTimeout(() => {
toast.classList.add("is-leaving");
}, duration - 300);

window.setTimeout(() => toast.remove(), duration + 120);
}

function setSidebarOpen(isOpen) {
const sidebar = document.getElementById("app-sidebar");
const menuButton = document.getElementById("mobile-menu-button");
sidebar.classList.toggle("is-open", isOpen);
menuButton.setAttribute("aria-expanded", String(isOpen));
menuButton.setAttribute(
"aria-label",
isOpen ? "Fechar menu principal" : "Abrir menu principal"
);
}

function navigateToView(viewName, options = {}) {
if (!["members", "settings"].includes(viewName)) return;
if (viewName === "settings" && !canCurrentUserEdit()) {
showToast(
"As configurações são exclusivas de usuários com acesso total.",
"warning"
);
return;
}

if (
!options.force &&
viewName !== "members" &&
(appState.editingMembers ||
appState.removingMembers ||
appState.addingMember)
) {
showToast(
"Conclua ou cancele a ação atual antes de trocar de página.",
"warning"
);
return;
}

appState.currentView = viewName;
document.querySelectorAll(".app-view").forEach((view) => {
view.hidden = view.dataset.view !== viewName;
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
const isActive = button.dataset.viewTarget === viewName;
button.classList.toggle("is-active", isActive);
if (isActive) {
button.setAttribute("aria-current", "page");
} else {
button.removeAttribute("aria-current");
}
});

const isSettings = viewName === "settings";
document.getElementById("topbar-page-title").textContent = isSettings
? "Configurações da RondList"
: "Controle de membros";
document.title = isSettings
? "Configurações · RondList"
: "RondList";

const page = document.querySelector(".page");
page.scrollTop = 0;
setSidebarOpen(false);
}

window.RondList = Object.freeze({
config: CONFIG,
worker: Object.freeze({
buildUrl: buildWorkerUrl,
fetch: fetchViaWorker
}),
auth: Object.freeze({
getCurrentUser: () => currentUser,
refresh: initializeAuthentication
}),
sheets: Object.freeze({
request: requestRondList,
fetchViaWorker
})
});

document
.getElementById("refresh-members")
.addEventListener("click", () =>
loadRondList({ force: true })
);

document
.getElementById("refresh-settings")
.addEventListener("click", () =>
loadRondList({ force: true })
);

document
.getElementById("additional-access-type")
.addEventListener("change", updateAdditionalAccessField);

document
.getElementById("additional-access-form")
.addEventListener("submit", saveAdditionalAccess);

document
.getElementById("open-requirements")
.addEventListener("click", openStampDialog);

document
.getElementById("close-requirements")
.addEventListener("click", closeRequirementsDialog);

document
.getElementById("dismiss-requirements")
.addEventListener("click", closeRequirementsDialog);

document
.getElementById("post-requirements-stamp")
.addEventListener("click", postRequirementsStamp);

requirementTagInputs().forEach((input) => {
input.addEventListener("input", handleRequirementTagInput);
input.addEventListener("paste", handleRequirementTagPaste);
input.addEventListener("keydown", handleRequirementTagKeydown);
});

document
.getElementById("requirements-dialog")
.addEventListener("click", (event) => {
if (event.target === event.currentTarget) closeRequirementsDialog();
});

document
.getElementById("requirements-dialog")
.addEventListener("cancel", (event) => {
if (appState.requirementsBusy) {
event.preventDefault();
}
});

document
.getElementById("open-publishing")
.addEventListener("click", openPublishingDialog);

document
.getElementById("close-publishing")
.addEventListener("click", closePublishingDialog);

document
.getElementById("dismiss-publishing")
.addEventListener("click", closePublishingDialog);

document
.getElementById("publish-mode-manual")
.addEventListener("click", () => setPublishingMode("manual"));

document
.getElementById("publish-mode-auto")
.addEventListener("click", () => setPublishingMode("automatic"));

document
.querySelectorAll("[data-copy-publish]")
.forEach((button) => {
button.addEventListener("click", () =>
copyPublishingText(button.dataset.copyPublish)
);
});

document
.querySelectorAll("[data-publish-action]")
.forEach((button) => {
button.addEventListener("click", () =>
runAutomaticPublishing(button.dataset.publishAction)
);
});

document
.getElementById("publish-all-actions")
.addEventListener("click", runAutomaticPublishingSequence);

document
.getElementById("publishing-dialog")
.addEventListener("click", (event) => {
if (event.target === event.currentTarget) closePublishingDialog();
});

document
.getElementById("publishing-dialog")
.addEventListener("cancel", (event) => {
if (appState.publishingBusy) {
event.preventDefault();
}
});

document
.getElementById("member-search")
.addEventListener("input", (event) => {
appState.search = event.target.value;
renderMembers();
});

document
.getElementById("edit-members")
.addEventListener("click", beginMemberEditing);

document
.getElementById("organize-members")
.addEventListener("click", organizeMemberList);

document
.getElementById("save-members-edit")
.addEventListener("click", saveMemberList);

document
.getElementById("cancel-members-edit")
.addEventListener("click", cancelMemberEditing);

document
.getElementById("add-member")
.addEventListener("click", openAddMemberEditor);

document
.getElementById("add-member-form")
.addEventListener("submit", saveNewMember);

document
.getElementById("close-add-member")
.addEventListener("click", closeAddMemberEditor);

document
.getElementById("cancel-add-member")
.addEventListener("click", closeAddMemberEditor);

document
.getElementById("add-member-editor")
.addEventListener("click", (event) => {
if (event.target === event.currentTarget) closeAddMemberEditor();
});

document
.getElementById("add-member-editor")
.addEventListener("cancel", (event) => {
if (appState.savingMembers) {
event.preventDefault();
return;
}
appState.addingMember = false;
updateMemberEditControls();
});

document
.getElementById("add-member-editor")
.addEventListener("close", () => {
appState.addingMember = false;
updateMemberEditControls();
});

document
.getElementById("remove-members")
.addEventListener("click", beginMemberRemoval);

document
.getElementById("confirm-members-remove")
.addEventListener("click", confirmMemberRemoval);

document
.getElementById("cancel-members-remove")
.addEventListener("click", cancelMemberRemoval);

document
.getElementById("settings-editor-form")
.addEventListener("submit", saveRoleSettings);

document
.getElementById("close-settings-editor")
.addEventListener("click", closeSettingsEditor);

document
.getElementById("cancel-settings-editor")
.addEventListener("click", closeSettingsEditor);

document
.getElementById("settings-editor")
.addEventListener("click", (event) => {
if (event.target === event.currentTarget) closeSettingsEditor();
});

document
.getElementById("edit-layout")
.addEventListener("click", openLayoutEditor);

document
.getElementById("layout-editor-form")
.addEventListener("submit", saveLayoutSettings);

document
.getElementById("close-layout-editor")
.addEventListener("click", closeLayoutEditor);

document
.getElementById("cancel-layout-editor")
.addEventListener("click", closeLayoutEditor);

document
.getElementById("layout-editor")
.addEventListener("click", (event) => {
if (event.target === event.currentTarget) closeLayoutEditor();
});

document
.getElementById("mobile-menu-button")
.addEventListener("click", () => {
const sidebar = document.getElementById("app-sidebar");
setSidebarOpen(!sidebar.classList.contains("is-open"));
});

document
.getElementById("sidebar-overlay")
.addEventListener("click", () => setSidebarOpen(false));

document.querySelectorAll("[data-view-target]").forEach((navItem) => {
navItem.addEventListener("click", () => {
navItem.classList.remove("is-pulsing");
void navItem.offsetWidth;
navItem.classList.add("is-pulsing");
window.setTimeout(
() => navItem.classList.remove("is-pulsing"),
440
);
navigateToView(navItem.dataset.viewTarget);
});
});

document
.getElementById("sidebar-logo")
.addEventListener("click", (event) => {
event.preventDefault();
navigateToView("members");
});

document.addEventListener("keydown", (event) => {
if (event.key === "Escape") {
setSidebarOpen(false);
setVisionPanelOpen(false);
}
});

window.addEventListener("resize", () => {
if (window.innerWidth >= 768) setSidebarOpen(false);
});

initializeTheme();
initializeVisionTools();
updateAdditionalAccessField();
navigateToView("members", { force: true });
initializeAuthentication();
})();
