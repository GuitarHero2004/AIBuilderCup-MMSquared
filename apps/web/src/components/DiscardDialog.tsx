import { useEffect, useRef } from 'react';

export function DiscardDialog({ uncertain, editing, onKeep, onDiscard }: { uncertain: boolean; editing: boolean; onKeep: () => void; onDiscard: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const keep = useRef<HTMLButtonElement>(null);
  const discard = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const element = dialog.current;
    element?.showModal();
    keep.current?.focus();
    return () => { element?.close(); if (previous?.isConnected) previous.focus(); };
  }, []);
  return <dialog ref={dialog} className="discard-dialog" aria-labelledby="discard-title" aria-describedby="discard-description" onCancel={(event) => { event.preventDefault(); onKeep(); }} onKeyDown={(event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === keep.current) { event.preventDefault(); discard.current?.focus(); }
    else if (!event.shiftKey && document.activeElement === discard.current) { event.preventDefault(); keep.current?.focus(); }
  }}>
    <h2 id="discard-title">Discard this draft?</h2>
    <p id="discard-description">{uncertain ? 'The save outcome is still unknown. Discarding this form does not delete a case that may have been saved. Check saved cases before creating another.' : editing ? 'Your unsaved requirements will be lost. Keep editing to return to the form.' : 'Your unsaved draft will be removed. Any case already saved in your workspace will remain.'}</p>
    <div className="dialog-actions"><button ref={keep} type="button" className="button button-secondary" onClick={onKeep}>{editing ? 'Keep editing' : 'Keep draft'}</button><button ref={discard} type="button" className="button button-danger" onClick={onDiscard}>Discard changes</button></div>
  </dialog>;
}
