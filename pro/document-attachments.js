import { getDataOwnerId, getWorkspaceContext, supabase } from './backend.js';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'text/plain', 'text/csv',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

const isEstimatePage = window.location.pathname.startsWith('/pro/estimates');
const config = isEstimatePage
  ? { table: 'estimate_attachments', idColumn: 'estimate_id', bucket: 'estimate-attachments', selector: '.estimate-actions' }
  : { table: 'invoice_attachments', idColumn: 'invoice_id', bucket: 'invoice-attachments', selector: '[data-print-invoice]' };

let workspace = null;
let dataOwner = null;

function esc(value = '') {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#039;', '"': '&quot;' })[char]);
}
function bytes(value) {
  const n = Number(value) || 0;
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 ** 2).toFixed(1)} MB`;
}
function safeName(name) {
  return String(name || 'attachment').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(-120) || 'attachment';
}
function showError(error) {
  console.error(error);
  alert(error?.message || 'Could not manage attachment.');
}
async function ensureContext() {
  workspace = workspace || await getWorkspaceContext();
  dataOwner = dataOwner || await getDataOwnerId();
  if (!workspace || !dataOwner) throw new Error('Workspace not found.');
  return workspace;
}

const dialog = document.createElement('dialog');
dialog.className = 'modal attachment-modal';
dialog.innerHTML = `<div class="modal-card attachment-card">
  <div class="modal-head"><div><p class="eyebrow">PRIVATE DOCUMENTS</p><h2 id="attachmentTitle">Attachments</h2></div><button class="icon-btn" type="button" id="attachmentClose" aria-label="Close">×</button></div>
  <div class="attachment-upload"><input id="attachmentInput" type="file" hidden multiple accept=".pdf,.jpg,.jpeg,.png,.txt,.csv,.doc,.docx,.xls,.xlsx"><button class="btn primary" type="button" id="attachmentChoose">+ Upload files</button><small class="muted">Up to 10 MB each · PDF, images, text, Word and Excel</small></div>
  <div id="attachmentStatus" class="muted" aria-live="polite"></div>
  <div id="attachmentList"></div>
</div>`;
document.body.appendChild(dialog);

const style = document.createElement('style');
style.textContent = `.attachment-card{max-width:720px}.attachment-upload{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px}.attachment-list{display:grid;gap:8px}.attachment-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;padding:12px;border:1px solid var(--border,#e5e7eb);border-radius:12px}.attachment-row strong{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.attachment-meta{font-size:12px;color:#6b7280;margin-top:3px}.attachment-actions{display:flex;gap:6px}.attachment-empty{padding:24px;text-align:center;color:#6b7280;border:1px dashed #d1d5db;border-radius:12px}`;
document.head.appendChild(style);

const title = dialog.querySelector('#attachmentTitle');
const list = dialog.querySelector('#attachmentList');
const status = dialog.querySelector('#attachmentStatus');
const input = dialog.querySelector('#attachmentInput');
const chooseButton = dialog.querySelector('#attachmentChoose');
let currentDocumentId = null;

dialog.querySelector('#attachmentClose').onclick = () => dialog.close();
chooseButton.onclick = async () => {
  try {
    await ensureContext();
    if (!workspace.canWrite) throw new Error('Editor access is required to upload attachments.');
    input.click();
  } catch (error) { showError(error); }
};

async function loadAttachments() {
  if (!currentDocumentId) return;
  await ensureContext();
  status.textContent = 'Loading attachments…';
  const { data, error } = await supabase.from(config.table).select('*').eq(config.idColumn, currentDocumentId).eq('user_id', dataOwner).order('created_at', { ascending: false });
  if (error) throw error;
  status.textContent = '';
  const rows = data || [];
  list.innerHTML = rows.length ? `<div class="attachment-list">${rows.map((item) => `<div class="attachment-row">
    <div><strong title="${esc(item.file_name)}">${esc(item.file_name)}</strong><div class="attachment-meta">${bytes(item.size_bytes)}${item.mime_type ? ` · ${esc(item.mime_type)}` : ''}</div></div>
    <div class="attachment-actions"><button class="mini-btn" type="button" data-open-attachment="${item.id}">Open</button>${workspace.canWrite ? `<button class="mini-btn" type="button" data-delete-attachment="${item.id}">Remove</button>` : ''}</div>
  </div>`).join('')}</div>` : '<div class="attachment-empty">No attachments yet.</div>';

  list.querySelectorAll('[data-open-attachment]').forEach((button) => button.onclick = async () => {
    const item = rows.find((row) => row.id === button.dataset.openAttachment);
    if (!item) return;
    button.disabled = true;
    try {
      const { data: signed, error: signedError } = await supabase.storage.from(config.bucket).createSignedUrl(item.storage_path, 60);
      if (signedError) throw signedError;
      window.open(signed.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (error) { showError(error); }
    finally { button.disabled = false; }
  });

  list.querySelectorAll('[data-delete-attachment]').forEach((button) => button.onclick = async () => {
    const item = rows.find((row) => row.id === button.dataset.deleteAttachment);
    if (!item || !confirm(`Remove ${item.file_name}?`)) return;
    button.disabled = true;
    try {
      await ensureContext();
      if (!workspace.canWrite) throw new Error('Editor access is required to remove attachments.');
      const { error: storageError } = await supabase.storage.from(config.bucket).remove([item.storage_path]);
      if (storageError) throw storageError;
      const { error: rowError } = await supabase.from(config.table).delete().eq('id', item.id).eq('user_id', dataOwner);
      if (rowError) throw rowError;
      await loadAttachments();
    } catch (error) { showError(error); button.disabled = false; }
  });
}

input.onchange = async () => {
  const files = [...(input.files || [])];
  input.value = '';
  if (!files.length || !currentDocumentId) return;
  try {
    await ensureContext();
    if (!workspace.canWrite) throw new Error('Editor access is required to upload attachments.');
    for (const file of files) {
      if (file.size > MAX_BYTES) throw new Error(`${file.name} is larger than 10 MB.`);
      if (file.type && !ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} is not a supported file type.`);
      status.textContent = `Uploading ${file.name}…`;
      const path = `${dataOwner}/${currentDocumentId}/${crypto.randomUUID()}-${safeName(file.name)}`;
      const { error: uploadError } = await supabase.storage.from(config.bucket).upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined });
      if (uploadError) throw uploadError;
      const payload = { user_id: dataOwner, [config.idColumn]: currentDocumentId, file_name: file.name, storage_path: path, mime_type: file.type || null, size_bytes: file.size };
      const { error: rowError } = await supabase.from(config.table).insert(payload);
      if (rowError) {
        await supabase.storage.from(config.bucket).remove([path]);
        throw rowError;
      }
    }
    await loadAttachments();
  } catch (error) { status.textContent = ''; showError(error); }
};

async function openManager(documentId) {
  currentDocumentId = documentId;
  title.textContent = isEstimatePage ? 'Estimate attachments' : 'Invoice attachments';
  list.innerHTML = '';
  dialog.showModal();
  try {
    await ensureContext();
    chooseButton.hidden = !workspace.canWrite;
    await loadAttachments();
  } catch (error) { status.textContent = ''; showError(error); }
}

function estimateIdFromHost(host) {
  return host?.dataset?.estimateId || host?.querySelector('[data-print-estimate]')?.dataset.printEstimate || host?.querySelector('[data-edit]')?.dataset.edit || '';
}

function enhance(root = document) {
  root.querySelectorAll(config.selector).forEach((anchor) => {
    const host = isEstimatePage ? anchor : anchor.parentElement;
    const documentId = isEstimatePage ? estimateIdFromHost(host) : anchor.dataset.printInvoice;
    if (!documentId || !host || host.querySelector(`[data-attachments-for="${documentId}"]`)) return;
    if (!isEstimatePage) {
      host.dataset.invoiceActions = '';
      host.dataset.invoiceId = documentId;
    }
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'mini-btn';
    button.dataset.attachmentsFor = documentId;
    button.textContent = 'Attachments';
    button.onclick = () => openManager(documentId);
    host.append(' ', button);
  });
}

enhance();
new MutationObserver(() => enhance()).observe(document.body, { childList: true, subtree: true });
window.addEventListener('solobizkit:workspace-updated', () => { workspace = null; dataOwner = null; enhance(); });
