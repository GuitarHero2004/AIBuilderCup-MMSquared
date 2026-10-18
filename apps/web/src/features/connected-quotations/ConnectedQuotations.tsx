import { useCallback, useEffect, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import type { ApiClient } from '../../api/client';
import { ApiError } from '../../api/client';
import type { AssistantAction, CaseRead, ConfirmQuote, ExtractRequest, MutationReceipt, QuoteList, QuoteRead, RunEvents, RunRead, SaveDraft } from '../../api/types';
import { QuotationIntake } from '../quotations/QuotationIntake';
import { demoSamples, loadDemoSample } from './demoSamples';
import { ConnectedSelections } from '../connected-selections/ConnectedSelections';
import { readSelectionAttempt } from '../connected-selections/recovery';
import type { SelectionSource } from '../connected-selections/recovery';
import { ConnectedComparison } from '../connected-comparison/ConnectedComparison';
import { Icon } from '../../components/Icon';
import { QuotationReview } from '../quotation-review/QuotationReview';
import type { ReviewNavigation, ReviewBatchAction, ReviewDocument, ReviewDraft, ReviewDraftField, ReviewOperation } from '../quotation-review/types';
import type { IntakeTransfer } from '../quotations/types';
import { applyReviewBatch } from '../quotation-review/model';
import { draftIssues, intakeCase, intakeQuote, reviewDraft, reviewFields, toSaveDraft, updateReviewDraft } from './adapters';
import { useAssistantScope } from '../assistant/context';
import './connected-quotations.css';

type Pending = { key: string; kind: 'upload' | 'save' | 'confirm' | 'extract'; quoteId?: string; sourceHash?: string; file?: File; revision?: number; body?: SaveDraft | ConfirmQuote | ExtractRequest };
export type QuotationNavigationGuard = ((proceed: () => void) => void) | null;
interface Props { api: ApiClient; ownerId: string; item: CaseRead; onBack: () => void; onCaseChanged: (item: CaseRead) => void; navigationGuardRef: MutableRefObject<QuotationNavigationGuard>; onBusy: (busy: boolean) => void; assistantTarget?: AssistantAction | null; onAssistantTargetConsumed?: () => void }
const reason = (error: unknown) => error instanceof ApiError ? `${error.message}${error.requestId ? ` Reference: ${error.requestId}.` : ''}` : 'The result could not be checked. Keep this view open and try checking the recorded state again.';
const stale = (error: unknown) => error instanceof ApiError && ['STALE_CASE_REVISION', 'STALE_DRAFT_REVISION', 'SOURCE_REFERENCE_CHANGED'].includes(error.code);
const uncertain = (error: unknown) => !(error instanceof ApiError) || error.outcomeUnknown;
const copy = (draft: ReviewDraft) => structuredClone(draft);

function readPending(storageKey: string): Pending | null {
  try {
    const raw = sessionStorage.getItem(storageKey), value: unknown = raw ? JSON.parse(raw) : null;
    if (value && typeof value === 'object' && 'key' in value && typeof value.key === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value.key) && 'kind' in value && ['upload','save','confirm','extract'].includes(String(value.kind))) {
      const candidate = value as Pending;
      if ((!candidate.quoteId && candidate.kind === 'upload') || candidate.quoteId && /^[a-f0-9]{32}$/.test(candidate.quoteId)) return { key: candidate.key, kind: candidate.kind, quoteId: candidate.quoteId };
    }
  } catch { /* An invalid opaque reference cannot authorize recovery. */ }
  return null;
}
function assertCurrentQuote(current: QuoteRead, previous: QuoteRead) {
  if (current.id !== previous.id || current.case_id !== previous.case_id || current.source_file.sha256 !== previous.source_file.sha256 || current.draft_revision < previous.draft_revision || current.case_data_revision < previous.case_data_revision) throw new ApiError('The current draft identity or revision could not be verified. Keep your edits and check again.', 'INVALID_RESPONSE');
}
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  return JSON.stringify(value) ?? 'null';
}
function assertReceiptBinding(receipt: MutationReceipt, attempt: Pending) {
  if (receipt.state !== 'committed' || !receipt.quote) return;
  const quote = receipt.quote;
  if (attempt.sourceHash && quote.source_file.sha256 !== attempt.sourceHash) throw new ApiError('The receipt refers to a different source PDF.', 'INVALID_RESPONSE', undefined, true);
  if (attempt.kind === 'upload' && attempt.revision !== undefined && (quote.case_data_revision !== attempt.revision + 1 || quote.draft_revision !== 0 || quote.status !== 'uploaded' || quote.source_extraction_run_id !== null)) throw new ApiError('The upload receipt did not match the submitted case revision.', 'INVALID_RESPONSE', undefined, true);
  if (attempt.body && attempt.kind !== 'extract' && 'source_extraction_run_id' in attempt.body) {
    const input = attempt.body, caseStep = quote.case_data_revision - input.expected_case_revision, draftStep = quote.draft_revision - input.expected_draft_revision;
    const revisionsMatch = attempt.kind === 'confirm' ? caseStep === 1 && draftStep === 0 : [0, 1].includes(caseStep) && caseStep === draftStep;
    if ('draft_data' in input && (canonical(quote.draft_data) !== canonical(input.draft_data) || canonical(quote.review_decisions) !== canonical(input.review_decisions))) throw new ApiError('The saved values did not match this submitted draft. Check the operation before continuing.', 'INVALID_RESPONSE', undefined, true);
    if (!revisionsMatch || quote.source_extraction_run_id !== input.source_extraction_run_id) throw new ApiError('The receipt did not match the submitted draft and extraction revision. Check the recorded operation again.', 'INVALID_RESPONSE', undefined, true);
  }
}
export function ConnectedQuotations({ api, ownerId, item, onBack, onCaseChanged, navigationGuardRef, onBusy, assistantTarget, onAssistantTargetConsumed }: Props) {
  const storageKey = `greenprocure:pending-quotation:${ownerId}:${item.id}`;
  const [pending, setPending] = useState<Pending | null>(() => readPending(storageKey));
  const [collection, setCollection] = useState<QuoteList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [transfer, setTransfer] = useState<IntakeTransfer>(() => pending ? { status: 'uncertain', message: 'An earlier operation needs readback. Check its recorded result before adding or changing quotations. Unsaved browser edits were not stored.' } : { status: 'idle' });
  const [selected, setSelected] = useState<QuoteRead | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [selectionView, setSelectionView] = useState<{ source: SelectionSource | null; savedId?: string } | null>(() => !pending && readSelectionAttempt(ownerId, item.id) ? { source: null } : null);
  const reviewNavigation = useRef<ReviewNavigation>(null);
  const consumedAssistantTarget = useRef<AssistantAction | null>(null);
  const [comparisonRefresh, setComparisonRefresh] = useState(0);
  const [selectionBusy, setSelectionBusy] = useState(false);
  const selectionNavigation = useRef<QuotationNavigationGuard>(null);
  const [draft, setDraft] = useState<ReviewDraft>({});
  const [unknownNote, setUnknownNote] = useState('');
  const [saved, setSaved] = useState<ReviewDraft>({});
  const [operation, setOperation] = useState<ReviewOperation>({ status: 'idle' });
  const [sourceState, setSource] = useState<ReviewDocument & { identity?: string }>({ fileName: '', url: null, pageCount: null, availability: 'loading' });
  const [busy, setBusy] = useState(false);
  const [canCloseAttempt, setCanCloseAttempt] = useState(false);
  const [notice, setNotice] = useState('');
  const [selectionReset, setSelectionReset] = useState(0);
  const [events, setEvents] = useState<RunEvents | null>(null);
  const [run, setRun] = useState<RunRead | null>(null);
  const [conflict, setConflict] = useState<QuoteRead | null>(null);
  const [showConflict, setShowConflict] = useState(false);
  const [leave, setLeave] = useState<{ proceed: () => void } | null>(null);
  const [sourceRetry, setSourceRetry] = useState(0);
  const mounted = useRef(true);
  const sampleController = useRef<AbortController | null>(null);
  const lock = useRef(false);
  const pendingRef = useRef<Pending | null>(pending);
  const readGeneration = useRef(0);
  const discardDialog = useRef<HTMLDialogElement>(null);
  const conflictDialog = useRef<HTMLDialogElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const blocked = busy || pending !== null || selectionBusy;
  const issues = selected ? draftIssues(selected, draft, dirty) : [];

  const remember = useCallback((value: Pending | null) => {
    pendingRef.current = value; setPending(value); if (!value) setCanCloseAttempt(false);
    try {
      if (value) sessionStorage.setItem(storageKey, JSON.stringify({ key: value.key, kind: value.kind, quoteId: value.quoteId }));
      else sessionStorage.removeItem(storageKey);
    } catch { /* In-memory recovery remains available when browser storage is denied. */ }
  }, [storageKey]);
  const applyQuote = useCallback((quote: QuoteRead) => {
    setSelected(quote); setUnknownNote(''); const next = reviewDraft(quote); setDraft(next); setSaved(copy(next)); setConflict(null); setOperation({ status: 'idle' });
  }, []);
  const readCollection = useCallback(() => {
    const generation = ++readGeneration.current;
    return Promise.all([api.listQuotes(item.id), api.getCase(item.id)]).then(([quotes, currentCase]) => {
      if (!mounted.current || generation !== readGeneration.current) return;
      if (quotes.case_id !== item.id || currentCase.id !== item.id) throw new ApiError('The saved case identity did not match this view.', 'INVALID_RESPONSE');
      setCollection(quotes); setLoadError(null); onCaseChanged(currentCase);
    }).catch(error => { if (mounted.current && generation === readGeneration.current) setLoadError(reason(error)); })
      .finally(() => { if (mounted.current && generation === readGeneration.current) setLoading(false); });
  }, [api, item.id, onCaseChanged]);
  const refreshCollection = useCallback(() => { setLoading(true); setLoadError(null); return readCollection(); }, [readCollection]);
  useEffect(() => {
    mounted.current = true;
    void readCollection();
    return () => { mounted.current = false; readGeneration.current += 1; sampleController.current?.abort(); };
  }, [readCollection]);
  useEffect(() => { onBusy(blocked); return () => onBusy(false); }, [blocked, onBusy]);
  useEffect(() => {
    if (!dirty && !unknownNote.trim() && !blocked) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, unknownNote, blocked]);
  useEffect(() => {
    navigationGuardRef.current = (proceed) => {
      if (selectionView && selectionNavigation.current) { selectionNavigation.current(proceed); return; }
      if (lock.current || pendingRef.current) { setNotice('Check the current operation before leaving this case.'); return; }
      if (dirty || unknownNote.trim()) setLeave({ proceed }); else proceed();
    };
    return () => { navigationGuardRef.current = null; };
  }, [dirty, unknownNote, navigationGuardRef, selectionView]);
  useEffect(() => {
    const element = discardDialog.current;
    if (leave) { element?.showModal(); element?.querySelector<HTMLButtonElement>('button')?.focus(); }
    else element?.close();
  }, [leave]);
  useEffect(() => {
    const element = conflictDialog.current;
    if (showConflict) { element?.showModal(); element?.querySelector<HTMLButtonElement>('button')?.focus(); }
    else element?.close();
  }, [showConflict]);
  const sourceQuoteId = selected?.id, sourceHash = selected?.source_file.sha256, sourceFileName = selected?.source_file.name ?? '', sourcePages = selected?.source_file.pages ?? null;
  const sourceIdentity = `${sourceQuoteId ?? ''}:${sourceHash ?? ''}`;
  const source: ReviewDocument = sourceState.identity === sourceIdentity ? sourceState : { fileName: sourceFileName, pageCount: sourcePages, url: null, availability: 'loading' };
  useEffect(() => {
    if (!sourceQuoteId) return;
    let active = true, objectUrl: string | null = null;
    void api.getDocument(item.id, sourceQuoteId).then(blob => {
      if (!active) return; objectUrl = URL.createObjectURL(blob);
      setSource({ identity: sourceIdentity, fileName: sourceFileName, pageCount: sourcePages, url: objectUrl, availability: 'ready' });
    }).catch(error => { if (active) setSource({ identity: sourceIdentity, fileName: sourceFileName, pageCount: sourcePages, url: null, availability: 'unavailable', message: reason(error) }); });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [api, item.id, sourceQuoteId, sourceIdentity, sourceFileName, sourcePages, sourceRetry]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-page-title]')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [selected?.id]);

  async function refreshEvents(result: RunRead) {
    setRun(result);
    try { const next = await api.getRunEvents(item.id, result.id); if (mounted.current && next.run_id === result.id) setEvents(next); } catch { if (mounted.current) setEvents(null); }
  }
  async function acceptReceipt(receipt: MutationReceipt, attempt: Pending): Promise<boolean> {
    if (receipt.request_key !== attempt.key || receipt.kind !== attempt.kind || attempt.quoteId && receipt.quote_id && receipt.quote_id !== attempt.quoteId || receipt.quote && receipt.quote.case_id !== item.id) throw new ApiError('The operation receipt did not match the submitted request. Check the recorded result again.', 'INVALID_RESPONSE', undefined, true);
    assertReceiptBinding(receipt, attempt);
    if (receipt.state === 'committed' && receipt.quote) {
      setNotice(attempt.kind === 'confirm' ? '' : attempt.kind === 'save' ? 'Your draft was saved. Confirm this saved revision only after reviewing its information and limitations.' : 'The PDF was saved privately. Start extraction when you are ready.');
      remember(null); setTransfer({ status: 'idle' }); setOperation({ status: 'idle' });
      if (attempt.kind === 'upload') setSelectionReset(v => v + 1);
      else {
        applyQuote(receipt.quote);
        // The receipt acknowledges this operation. Read the current version separately;
        // a later saved draft must never be replaced by an old idempotency result.
        try {
          const current = await api.getQuote(item.id, receipt.quote.id);
          assertCurrentQuote(current, receipt.quote);
          if (mounted.current) { applyQuote(current); if (current.draft_revision !== receipt.quote.draft_revision) setNotice('Your earlier operation was saved. A newer draft is now displayed and needs its own review.'); }
        } catch (error) {
          if (mounted.current) { setOperation({ status: 'conflict', message: 'Your operation was recorded, but the current draft could not be checked. Refresh the saved draft before another change.' }); setLoadError(reason(error)); }
        }
      }
      await refreshCollection();
      if (attempt.kind === 'confirm' && mounted.current) requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-page-title]')?.focus());
      return true;
    }
    if (receipt.state === 'rejected' || receipt.state === 'interrupted') {
      remember(null); setTransfer({ status: 'error', message: receipt.error?.message ?? 'The server recorded that the operation did not complete. Review the saved state before retrying.' }); setOperation({ status: 'error', message: receipt.error?.message ?? 'The operation was not committed. Your edits are still here.' }); await refreshCollection(); return true;
    }
    setTransfer({ status: 'uncertain', message: 'The server has recorded this operation but has not confirmed its result. Check again; completion is not guaranteed.' });
    setOperation({ status: 'uncertain', action: attempt.kind === 'confirm' ? 'confirm' : 'save', message: 'The operation is recorded but no committed result is available. Check the same operation again.' }); return false;
  }
  async function acceptRun(result: RunRead, attempt: Pending) {
    if (result.request_key !== attempt.key || result.quote_id !== attempt.quoteId || attempt.body && (result.expected_case_revision !== attempt.body.expected_case_revision || result.expected_draft_revision !== attempt.body.expected_draft_revision)) throw new ApiError('The extraction result did not match this request.', 'INVALID_RESPONSE', undefined, true);
    await refreshEvents(result);
    if (!mounted.current) return;
    if (result.status === 'running') setTransfer({ status: 'uncertain', message: 'Extraction is recorded as running. Check the saved status again. A connection loss does not guarantee background completion.' });
    else { remember(null); setTransfer({ status: 'idle' }); setNotice(['awaiting_review','succeeded'].includes(result.status) ? 'Gemini returned a saved draft. Review it against the source PDF before confirming.' : result.error?.message ?? `Extraction ${result.status.replaceAll('_', ' ')}. Your PDF remains saved.`); }
    await refreshCollection();
  }
  async function loadConflict(error: unknown) {
    setOperation({ status: 'conflict', message: `${reason(error)} Your local edits are retained. Load and compare the current saved draft before continuing.` });
    if (selected) try { const latest = await api.getQuote(item.id, selected.id); assertCurrentQuote(latest, selected); if (mounted.current) setConflict(latest); } catch (readError) { if (mounted.current) setNotice(reason(readError)); }
    await refreshCollection();
  }
  async function perform(attempt: Pending) {
    if (lock.current) return;
    lock.current = true; setBusy(true); remember(attempt); setNotice('');
    if (attempt.kind === 'upload') setTransfer({ status: 'uploading' });
    else if (attempt.kind === 'extract') { setTransfer({ status: 'checking', message: 'The extraction request has been sent. Wait for its recorded result; this can take up to two minutes.' }); setEvents(null); setRun(null); }
    else setOperation({ status: attempt.kind === 'save' ? 'saving' : 'confirming', action: attempt.kind });
    try {
      if (attempt.kind === 'extract') { const result = await api.extractQuote(item.id, attempt.body as ExtractRequest, attempt.key); if (mounted.current) await acceptRun(result, attempt); }
      else {
        const result = attempt.kind === 'upload' ? await api.uploadQuote(item.id, attempt.file!, attempt.revision!, attempt.key)
          : attempt.kind === 'save' ? await api.saveDraft(item.id, attempt.quoteId!, attempt.body as SaveDraft, attempt.key)
          : await api.confirmQuote(item.id, attempt.quoteId!, attempt.body as ConfirmQuote, attempt.key);
        if (mounted.current) await acceptReceipt(result, attempt);
      }
    } catch (error) {
      if (!mounted.current) return;
      if (uncertain(error)) { setTransfer({ status: 'uncertain', message: reason(error) }); setOperation({ status: 'uncertain', action: attempt.kind === 'confirm' ? 'confirm' : 'save', message: reason(error) }); }
      else {
        remember(null);
        if (stale(error) && selected) await loadConflict(error);
        else { setTransfer({ status: 'error', message: reason(error) }); setOperation({ status: 'error', message: reason(error) }); if (stale(error)) await refreshCollection(); }
      }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function addSample(sampleId: string) {
    if (!collection?.capabilities.upload_enabled || loading || loadError || pendingRef.current || lock.current
      || collection.items.length >= collection.limits.maximum_quotes_per_case) return;
    const revision = collection.case_data_revision;
    const generation = readGeneration.current;
    const controller = new AbortController();
    sampleController.current = controller;
    lock.current = true; setBusy(true); setNotice('');
    setTransfer({ status: 'uploading', message: 'Loading and checking the example PDF before uploading it to your private case.' });
    let file: File;
    try {
      file = await loadDemoSample(sampleId, controller.signal);
      if (!mounted.current || controller.signal.aborted) return;
      if (generation !== readGeneration.current) throw new Error('The quotation list changed. Check the current list before adding the example.');
    } catch (error) {
      if (mounted.current) setTransfer({ status: 'error', message: error instanceof Error && error.name !== 'AbortError' ? error.message : 'The example download stopped. No PDF was uploaded. Please try again.' });
      return;
    } finally {
      if (sampleController.current === controller) sampleController.current = null;
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
    // The checked PDF enters the same idempotent upload path as a buyer-selected file.
    // No pending server operation is recorded for a failed download.
    if (mounted.current && !controller.signal.aborted) await perform({ kind: 'upload', key: crypto.randomUUID(), file, revision });
  }
  async function checkSaved() {
    const attempt = pendingRef.current;
    if (lock.current) return;
    if (!attempt) { await refreshCollection(); return; }
    lock.current = true; setBusy(true); setTransfer({ status: 'checking' }); setOperation({ status: 'checking', action: attempt.kind === 'confirm' ? 'confirm' : 'save' });
    try {
      if (attempt.kind === 'extract') { const result = await api.getRunOperation(item.id, attempt.key); if (mounted.current) await acceptRun(result, attempt); }
      else {
        const result = attempt.kind === 'upload' ? await api.getIntakeOperation(item.id, attempt.key) : await api.getReviewOperation(item.id, attempt.quoteId!, attempt.key);
        if (mounted.current) await acceptReceipt(result, attempt);
      }
    } catch (error) {
      if (error instanceof ApiError && ['INTAKE_NOT_FOUND', 'REVIEW_OPERATION_NOT_FOUND', 'RUN_NOT_FOUND'].includes(error.code)) setCanCloseAttempt(true);
      if (mounted.current) { const message = `${reason(error)} No new request has been submitted. A missing record does not prove that the earlier request failed.`; setTransfer({ status: 'uncertain', message }); setOperation({ status: 'uncertain', action: attempt.kind === 'confirm' ? 'confirm' : 'save', message }); }
    } finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  async function closeAttempt() {
    const attempt = pendingRef.current; if (!attempt || lock.current || !canCloseAttempt) return;
    lock.current = true; setBusy(true); let recorded = false;
    try {
      const result = await api.closeOperation(item.id, attempt.key, { kind: attempt.kind, quote_id: attempt.quoteId ?? null });
      if (!mounted.current) return;
      if (result.request_key !== attempt.key || result.kind !== attempt.kind || attempt.quoteId && result.quote_id !== attempt.quoteId) throw new ApiError('The recovery result did not match this operation.', 'INVALID_RESPONSE', undefined, true);
      if (result.state === 'cancelled') { remember(null); setTransfer({ status: 'idle' }); setOperation({ status: 'idle' }); setNotice('The server closed this unresolved attempt. It cannot commit later. Your saved quotations and any edits still in this tab remain available.'); await refreshCollection(); }
      else recorded = true;
    } catch (error) { if (mounted.current) { setTransfer({ status: 'uncertain', message: reason(error) }); setOperation({ status: 'uncertain', message: reason(error) }); } }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
    if (recorded && mounted.current) await checkSaved();
  }
  async function openReview(quoteId: string) {
    if (lock.current || pendingRef.current) return;
    lock.current = true; setBusy(true); setNotice('');
    try { const quote = await api.getQuote(item.id, quoteId); if (!mounted.current) return; if (quote.case_id !== item.id || quote.id !== quoteId || !quote.draft_data) throw new ApiError('The saved review draft is not available.', 'INVALID_RESPONSE'); applyQuote(quote); setComparisonOpen(false); }
    catch (error) { if (mounted.current) setNotice(reason(error)); }
    finally { lock.current = false; if (mounted.current) setBusy(false); }
  }
  function startExtraction(quoteId: string) {
    if (!collection?.capabilities.extraction_enabled || lock.current || pendingRef.current || loading || loadError) return;
    const quote = collection.items.find(q => q.id === quoteId); if (!quote) return;
    void perform({ kind: 'extract', key: crypto.randomUUID(), quoteId, body: { intent: 'extract_quote', quote_id: quoteId, expected_case_revision: collection.case_data_revision, expected_draft_revision: quote.draft_revision } });
  }
  function changeField(id: string, patch: Partial<ReviewDraftField>) {
    if (lock.current || pendingRef.current || operation.status === 'conflict') return;
    setDraft(current => updateReviewDraft(current, id, patch)); setOperation({ status: 'idle' });
  }
  function reviewBatch(action: ReviewBatchAction) {
    if (lock.current || pendingRef.current || operation.status === 'conflict' || !selected || source.availability !== 'ready') return false;
    const next = applyReviewBatch(reviewFields(selected), draft, issues, action);
    if (next === draft) { setOperation({ status: 'error', message: 'The displayed review fields changed. Inspect their latest values before acknowledging them together.' }); return false; }
    // A deliberate group action is one snapshot-checked update, never a loop of field setters.
    setDraft(next); setOperation({ status: 'idle' }); return true;
  }
  function saveDraft() {
    if (!selected || !dirty || unknownNote.trim() || blocked || operation.status === 'conflict' || issues.some(i => i.kind === 'validation' && i.blocksConfirmation)) return;
    try { void perform({ kind: 'save', key: crypto.randomUUID(), quoteId: selected.id, sourceHash: selected.source_file.sha256, body: toSaveDraft(selected, draft) }); }
    catch (error) { setOperation({ status: 'error', message: (error as Error).message }); }
  }
  function confirm() {
    if (!selected?.source_extraction_run_id || dirty || unknownNote.trim() || blocked || operation.status === 'conflict' || issues.some(i => i.blocksConfirmation) || selected.confirmation?.is_current) return;
    void perform({ kind: 'confirm', key: crypto.randomUUID(), quoteId: selected.id, sourceHash: selected.source_file.sha256, body: { expected_case_revision: selected.case_data_revision, expected_draft_revision: selected.draft_revision, source_extraction_run_id: selected.source_extraction_run_id, acknowledge_review: true } });
  }
  async function compareConflict() {
    if (lock.current || pendingRef.current || !selected) return;
    if (!conflict) {
      lock.current = true; setBusy(true);
      try { const latest = await api.getQuote(item.id, selected.id); assertCurrentQuote(latest, selected); if (mounted.current) { setConflict(latest); setShowConflict(true); } }
      catch (error) { if (mounted.current) setNotice(reason(error)); }
      finally { lock.current = false; if (mounted.current) setBusy(false); }
    } else setShowConflict(true);
  }
  function resolveConflict(keep: boolean) {
    if (!conflict) return;
    const latest = reviewDraft(conflict), next = copy(latest);
    if (keep) for (const [path, entry] of Object.entries(draft)) if (next[path] && JSON.stringify(entry) !== JSON.stringify(saved[path])) next[path] = { ...entry, reviewed: false };
    // Any requirement/source revision change requires renewed human checks.
    if (keep) for (const value of Object.values(next)) value.reviewed = false;
    setSelected(conflict); setSaved(latest); setDraft(next); setConflict(null); setShowConflict(false); setOperation({ status: 'idle' }); setNotice(keep ? 'Your edits were reapplied to the current draft. Review the fields again, save, then explicitly confirm.' : 'Your local edits were discarded and the current saved draft is displayed.');
  }
  function requestLeave(proceed: () => void) { navigationGuardRef.current?.(proceed); }
  function assistantAction(action: AssistantAction) {
    if (action.case_id !== item.id || action.expected_case_revision !== Math.max(item.data_revision, collection?.case_data_revision ?? 0, selected?.case_data_revision ?? 0)) return false;
    if (action.kind === 'open_intake') {
      // The existing guard first resolves pending operations and asks about any unsaved
      // quotation/selection edits. This callback runs only after that guard proceeds.
      requestLeave(() => {
        setSelected(null); setDraft({}); setSaved({}); setUnknownNote('');
        setOperation({ status: 'idle' }); setSelectionView(null); setComparisonOpen(false);
        setNotice(''); void refreshCollection();
      });
      return true;
    }
    const proceed = () => {
      if (action.kind === 'open_review' && action.quote_id) {
        if (selected?.id === action.quote_id && !comparisonOpen && !selectionView) { if (action.field_path) reviewNavigation.current?.focusField(action.field_path); return; }
        setSelectionView(null);
        void openReview(action.quote_id).then(() => { if (action.field_path) requestAnimationFrame(() => reviewNavigation.current?.focusField(action.field_path!)); });
      } else if (action.kind === 'open_comparison') {
        setSelected(null); setDraft({}); setSaved({}); setSelectionView(null); setComparisonOpen(true); setComparisonRefresh(value => value + 1);
      } else if (action.kind === 'open_selection' && action.selection_id) {
        setSelectionView({ source: null, savedId: action.selection_id });
      }
    };
    // Focusing within this same review does not discard or replace its unsaved draft.
    if (action.kind === 'open_review' && selected?.id === action.quote_id && !comparisonOpen && !selectionView) proceed();
    else requestLeave(proceed);
    return true;
  }
  useAssistantScope({ screen: selected && !comparisonOpen && !selectionView ? 'review' : 'intake', label: item.name + (selected && !comparisonOpen && !selectionView ? ' / ' + selected.source_file.name : ' / Quotations'), caseId: item.id, caseRevision: Math.max(item.data_revision, collection?.case_data_revision ?? 0, selected?.case_data_revision ?? 0), quoteId: !comparisonOpen && !selectionView ? selected?.id : null, draftRevision: !comparisonOpen && !selectionView ? selected?.draft_revision : null, dirty: dirty || Boolean(unknownNote.trim()), busy: blocked, unavailable: operation.status === 'conflict' ? 'Resolve the saved-draft conflict before asking for a new explanation.' : loadError ?? undefined }, 10, JSON.stringify([draft, unknownNote, operation.status]), assistantAction);
  useEffect(() => {
    if (!assistantTarget || consumedAssistantTarget.current === assistantTarget || loading || !collection) return;
    const frame = requestAnimationFrame(() => { consumedAssistantTarget.current = assistantTarget; if (!assistantAction(assistantTarget)) setNotice('The saved inputs changed before this assistant action opened. Check the current case and ask again.'); onAssistantTargetConsumed?.(); });
    return () => cancelAnimationFrame(frame);
  });

  const selectedFields = selected ? reviewFields(selected) : [];
  const conflictingFields = conflict ? selectedFields.filter(field => JSON.stringify(draft[field.id]) !== JSON.stringify(saved[field.id]) || JSON.stringify(reviewDraft(conflict)[field.id]) !== JSON.stringify(saved[field.id])) : [];
  const activityRun = selected ? selected.latest_run : run;
  const activityEvents = activityRun && events?.run_id === activityRun.id ? events.items : [];
  const completedExtraction = activityRun && ['awaiting_review', 'succeeded'].includes(activityRun.status);
  const activity = activityRun ? <section className="panel cq-activity" aria-label="Gemini extraction activity">
    <div className="cq-activity-heading"><h2>Gemini extraction</h2><span className={'status-badge ' + (completedExtraction ? 'status-success' : activityRun.status === 'running' ? 'status-neutral' : 'status-warning')}>{completedExtraction ? 'Draft extracted' : activityRun.status.replaceAll('_', ' ')}</span></div>
    <p>{activityRun.model_call_count} recorded model {activityRun.model_call_count === 1 ? 'call' : 'calls'}. {selected?.confirmation?.is_current && !dirty ? 'Your review is confirmed. Return to quotations to compare the saved terms.' : completedExtraction ? 'Next: check the cited terms, record your decisions and unknowns, then save and confirm.' : activityRun.error?.message ?? 'Check the recorded result before trying extraction again.'}</p>
    <details><summary>Inspect recorded extraction activity</summary><p className="cq-activity-reference">Run {activityRun.id}</p>{activityEvents.length ? <ol>{activityEvents.map(event => <li key={event.sequence}><span>{event.message}</span><time dateTime={event.timestamp}>{new Date(event.timestamp).toLocaleTimeString()}</time></li>)}</ol> : <p>Only the stored run status is available here.</p>}</details>
  </section> : null;
  return <>
    {notice && <div className="alert info-alert cq-notice" role="status">{notice}</div>}
    {!comparisonOpen && !selectionView && !selected && activity}
    {selectionView ? <ConnectedSelections api={api} ownerId={ownerId} item={item} source={selectionView.source} initialSelectionId={selectionView.savedId} navigationGuardRef={selectionNavigation} onBusy={setSelectionBusy}
      onBack={() => { setSelectionView(null); setComparisonOpen(!!selectionView.source); setNotice(''); void refreshCollection(); }} /> : comparisonOpen ? <ConnectedComparison key={comparisonRefresh} api={api} ownerId={ownerId} item={item} minimumRevision={Math.max(item.data_revision, collection?.case_data_revision ?? 0)} busy={busy}
      onBack={() => requestLeave(() => { setComparisonOpen(false); setNotice(''); void refreshCollection(); })}
      onReview={quoteId => requestLeave(() => { void openReview(quoteId); })}
      onSelect={source => requestLeave(() => { setNotice(''); setSelectionView({ source }); })} /> : selected ? <>
      <QuotationReview navigationRef={reviewNavigation} key={selected.id} quote={{ id: selected.id, supplierName: selected.draft_data?.supplier_name ?? 'Supplier not identified', caseName: item.name, caseRevision: selected.case_data_revision, savedDraftRevision: selected.draft_revision, extractionLabel: 'Check each extracted value and citation against the original PDF.' }}
        fields={selectedFields} draft={draft} issues={issues} document={source} dirty={dirty} operation={busy && operation.status === 'idle' ? { status: 'checking' } : operation}
        confirmation={selected.confirmation ? { draftRevision: selected.confirmation.draft_revision, confirmedAt: selected.confirmation.confirmed_at, reviewerLabel: 'You, in this private session' } : null}
        onFieldChange={changeField} onReviewBatch={reviewBatch} unknownNote={unknownNote} onUnknownNoteChange={setUnknownNote} activity={activity} onSave={saveDraft} onConfirm={confirm} onCheckSaved={() => { void checkSaved(); }} onResolveConflict={() => { void compareConflict(); }}
        onBack={() => requestLeave(() => { setSelected(null); setDraft({}); setSaved({}); setOperation({ status: 'idle' }); void refreshCollection(); })}
        onNext={() => requestLeave(() => { setSelected(null); setDraft({}); setSaved({}); void refreshCollection(); })} />
      {source.availability === 'unavailable' && <button className="button button-secondary" disabled={busy} onClick={() => setSourceRetry(v => v + 1)}>Retry loading the original PDF</button>}
    </> : <><QuotationIntake caseInfo={intakeCase(item, collection?.case_data_revision)} collection={{ status: loading ? 'loading' : loadError ? 'error' : collection ? 'ready' : 'unavailable', quotations: collection?.items.map(intakeQuote) ?? [], message: loadError ?? undefined }} transfer={transfer}
      limits={{ maxQuotes: collection?.limits.maximum_quotes_per_case ?? 4, maxFileBytes: collection?.limits.maximum_file_bytes ?? 10485760, maxPages: collection?.limits.maximum_pdf_pages ?? 10 }} samples={[...demoSamples]} showSamples requireSyntheticDeclaration
      uploadUnavailableReason={collection && !collection.capabilities.upload_enabled ? collection.capabilities.upload_reason ?? 'PDF upload is unavailable until private storage is configured.' : undefined}
      extractionUnavailableReason={collection && !collection.capabilities.extraction_enabled ? collection.capabilities.extraction_reason ?? 'Gemini extraction is unavailable until the model connection is configured.' : undefined}
      processingNotice={collection?.data_handling.processing_notice ?? 'The processing policy is unavailable until the saved collection is loaded.'} retentionNotice={collection?.data_handling.retention_notice ?? 'The retention policy has not been checked.'} selectionResetKey={selectionReset}
      onBack={() => requestLeave(onBack)} onRefresh={() => { void checkSaved(); }}
      onUpload={file => { if (collection?.capabilities.upload_enabled && !loading && !loadError && !pendingRef.current && !lock.current) void perform({ kind: 'upload', key: crypto.randomUUID(), file, revision: collection.case_data_revision }); }} onUseSample={sampleId => { void addSample(sampleId); }}
      onExtract={collection?.capabilities.extraction_enabled ? startExtraction : undefined} onRetryExtraction={collection?.capabilities.extraction_enabled ? startExtraction : undefined} onReview={quoteId => { void openReview(quoteId); }} />
      <section className="panel cc-entry" aria-label="Check confirmed quotations"><div><h2>Check confirmed offers</h2><p>See which confirmed terms meet your requirements and which need clarification. Unconfirmed drafts remain visible for follow-up.</p></div>
        <button type="button" className="button button-primary" disabled={blocked || loading || !!loadError || !collection} onClick={() => requestLeave(() => { setNotice(''); setComparisonOpen(true); })}>Compare confirmed terms<Icon name="arrow" size={17} /></button><button type="button" className="button button-secondary" disabled={blocked} onClick={() => requestLeave(() => { setNotice(''); setSelectionView({ source: null }); })}>Saved selections</button>
      </section></>}
    {pending && !busy && (pending.file || pending.body) && <section className="cq-replay"><p>If the recorded result is still unavailable, you can resend the exact same request. Its existing request key prevents a second saved operation.</p><button className="button button-secondary" onClick={() => { void perform(pending); }}>Retry the same request</button></section>}
    {pending && canCloseAttempt && <section className="cq-replay"><p>No operation record was found. Close this unresolved attempt to prevent a late request from saving. This does not cancel a model call that is already recorded.</p><button className="button button-secondary" disabled={busy} onClick={() => { void closeAttempt(); }}>Close unresolved attempt</button></section>}

    {!comparisonOpen && !selectionView && <p className="cq-availability">Requirement checks and saved buyer selection notes use confirmed quotation terms. Carbon estimates, supplier ranking, scenarios and full sourcing decisions are not connected yet.</p>}
    <dialog ref={discardDialog} className="discard-dialog" aria-labelledby="quotation-discard-title" onCancel={event => { event.preventDefault(); setLeave(null); }}><h2 id="quotation-discard-title">Discard unsaved review changes?</h2><p>Your last saved draft remains available. The changes in this browser have not been saved.</p><div className="dialog-actions"><button className="button button-secondary" onClick={() => setLeave(null)}>Keep editing</button><button className="button button-danger" onClick={() => { const proceed = leave?.proceed; setLeave(null); setUnknownNote(''); proceed?.(); }}>Discard changes</button></div></dialog>
    <dialog ref={conflictDialog} className="discard-dialog cq-conflict-dialog" aria-labelledby="quotation-conflict-title" onCancel={event => { event.preventDefault(); setShowConflict(false); }}><h2 id="quotation-conflict-title">Compare the current saved draft</h2><p>Your local edits have not overwritten the saved version. Keeping them requires renewed review against the current case and source.</p><div className="cq-conflict-rows">{conflictingFields.map(field => <section key={field.id}><h3>{field.label}</h3><dl><dt>Your local value</dt><dd>{draft[field.id]?.value || 'Unknown'}<small>{draft[field.id]?.note || 'No review note'}</small></dd><dt>Current saved value</dt><dd>{conflict ? reviewDraft(conflict)[field.id]?.value || 'Unknown' : 'Unavailable'}<small>{conflict ? reviewDraft(conflict)[field.id]?.note || 'No review note' : ''}</small></dd></dl></section>)}</div><div className="dialog-actions"><button className="button button-secondary" onClick={() => setShowConflict(false)}>Keep both for now</button><button className="button button-secondary" onClick={() => resolveConflict(false)}>Discard my edits and use latest</button><button className="button button-primary" onClick={() => resolveConflict(true)}>Keep my edits on the latest draft</button></div></dialog>
  </>;
}
