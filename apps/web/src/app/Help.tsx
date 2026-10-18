import { Icon } from '../components/Icon';
import { AgentAvatar } from '../features/assistant/AgentAvatar';
import { useAssistantStore } from '../features/assistant/context';
import './help.css';

export function Help({ onBack }: { onBack: () => void }) {
  const assistant = useAssistantStore();
  return <section className="workspace-guide" aria-labelledby="workspace-guide-title">
    <header className="page-heading">
      <div className="page-heading-copy"><p className="eyebrow">HELP</p><h1 id="workspace-guide-title" tabIndex={-1} data-page-title>Workspace guide</h1><p className="page-intro">Follow a quotation from your order requirements to a saved buyer selection.</p></div>
      <button type="button" className="button button-secondary" onClick={onBack}>Back to workspace</button>
    </header>

    <div className="guide-layout">
      <section className="panel guide-workflow" aria-labelledby="guide-workflow-title">
        <div className="guide-section-heading"><h2 id="guide-workflow-title">Your sourcing workflow</h2><p>Complete each review before moving to the next step.</p></div>
        <ol className="guide-steps">
          <li><span className="guide-step-number" aria-hidden="true">01</span><div><h3>Set your order requirements</h3><p>Choose <strong>Create sourcing case</strong>. Check the quantity, budget, order reference date, delivery window and destination, then save the case.</p><p className="guide-outcome"><strong>Result:</strong> a saved brief for checking your quotations.</p></div></li>
          <li><span className="guide-step-number" aria-hidden="true">02</span><div><h3>Add quotation PDFs</h3><p>Choose <strong>Open quotations</strong>. Select an example and choose <strong>Use synthetic sample</strong>, or add your own synthetic PDF with <strong>Upload quotation</strong>.</p><p className="guide-outcome"><strong>Result:</strong> a private source document, ready for extraction.</p></div></li>
          <li><span className="guide-step-number" aria-hidden="true">03</span><div><h3>Extract and check the terms</h3><p>Choose <strong>Extract information</strong>, then <strong>Review quotation</strong>. Check the cited values against the PDF, correct any errors and explain missing information.</p><p className="guide-outcome"><strong>Result:</strong> a draft with your review decisions and known gaps.</p></div></li>
          <li><span className="guide-step-number" aria-hidden="true">04</span><div><h3>Confirm the reviewed revision</h3><p>Resolve the cost and delivery basis, then choose <strong>Save draft</strong>. Choose <strong>Confirm reviewed quotation</strong> and confirm the saved revision in the dialog.</p><p className="guide-outcome"><strong>Result:</strong> a buyer-confirmed revision. Unknowns and failed checks still remain.</p></div></li>
          <li><span className="guide-step-number" aria-hidden="true">05</span><div><h3>Compare the confirmed terms</h3><p>Return to quotations and choose <strong>Compare confirmed terms</strong>. Use <strong>View checks</strong> to inspect each offer, then consider any displayed cost and delivery trade-off.</p><p className="guide-outcome"><strong>Result:</strong> requirement checks that show what passes, fails or needs review.</p></div></li>
          <li><span className="guide-step-number" aria-hidden="true">06</span><div><h3>Save and reopen your choice</h3><p>For an offer that meets the checked requirements, choose <strong>Record buyer selection</strong>. Enter your reason, acknowledge the scope and choose <strong>Save buyer selection</strong>. Return through <strong>Saved selections</strong> and <strong>Open selection</strong>.</p><p className="guide-outcome"><strong>Result:</strong> your choice, reason and checked snapshot preserved together.</p></div></li>
        </ol>
      </section>

      <aside className="guide-side" aria-label="Ways to get started">
        <section className="panel guide-card"><div className="guide-card-title"><AgentAvatar size={28} /><h2>Meet Luma</h2></div><p>Choose the floating <strong>Ask Luma</strong> button on any page. Use <strong>Workspace</strong> to find any of your saved cases or <strong>Current case</strong> for detailed help with the record you are viewing.</p><ul><li>Take me to my quotations.</li><li>Show my saved selections.</li><li>Explain the cost and delivery trade-off.</li></ul><button type="button" className="button button-secondary" onClick={() => assistant.setOpen(true)}>Ask Luma<Icon name="arrow" size={16} /></button><p className="guide-card-note">Luma reads your saved workspace, with Quill for quotations and Sage for sourcing. It does not capture your screen or read unsaved edits. You still review, confirm and save your choice.</p></section>
        <section className="panel guide-card"><div className="guide-card-title"><Icon name="fabric" size={20} /><h2>Try the example PDFs</h2></div><p>Keep the prefilled case requirements and add the Supplier A and Supplier B samples from quotation intake.</p><p>Each sample adds a real synthetic PDF. Extraction still runs through Gemini, and you review its output before comparison.</p><p className="guide-card-note">The examples demonstrate a cost and delivery trade-off. They are not real supplier offers.</p></section>
      </aside>
    </div>

    <section className="panel guide-reference" aria-labelledby="guide-reference-title">
      <div className="guide-section-heading"><h2 id="guide-reference-title">When you need more detail</h2><p>Find the recovery step or boundary that applies to your current task.</p></div>
      <details className="guide-disclosure"><summary>If an operation has not returned a clear result</summary><div className="guide-disclosure-content"><p>A missing response does not mean the operation failed. Use the recovery control on that screen before starting another attempt.</p><dl className="guide-recovery">
        <div><dt>Creating a case</dt><dd>Use <strong>Check saved cases</strong> and look for the case before resuming the draft.</dd></div>
        <div><dt>Uploading or extracting a quotation</dt><dd>Use <strong>Check saved quotations</strong> to read the recorded outcome. If extraction has failed, inspect the message before using <strong>Retry extraction</strong>.</dd></div>
        <div><dt>Saving or confirming a review</dt><dd>Use <strong>Check saved result</strong>. If a newer revision is reported, review the changed fields before saving or confirming again.</dd></div>
        <div><dt>Saving a buyer selection</dt><dd>Use <strong>Check save result</strong>. If a saved reference was received, use <strong>Read saved selection</strong> to reopen that record.</dd></div>
        <div><dt>Asking Luma</dt><dd>For current-case questions, use <strong>Check recorded result</strong> or <strong>Cancel request</strong>. For workspace questions, use <strong>Check navigation result</strong> or <strong>Cancel navigation request</strong>. Closing the panel does not cancel an active request.</dd></div>
      </dl></div></details>
      <details className="guide-disclosure"><summary>What the comparison checks</summary><div className="guide-disclosure-content"><ul>
        <li>The current demo checks one woven polyester-cotton fabric specification. The case quantity is in metres.</li>
        <li>The USD budget covers material and declared delivery charges, excluding taxes and duties. Review each quotation against that same cost basis.</li>
        <li>Delivery means the full order arriving within the stated calendar days from your saved order reference date.</li>
        <li>Only current buyer-confirmed revisions can supply comparison values. Missing information stays unknown; it does not count as zero or a pass.</li>
        <li>A saved selection is a buyer note. Carbon estimates, supplier ranking, supplier approval and purchase orders are outside this demo.</li>
      </ul></div></details>
      <details className="guide-disclosure"><summary>Your private session and demo limits</summary><div className="guide-disclosure-content"><ul>
        <li>Your anonymous session belongs to this browser. Clearing browser data, ending a private-browsing session or changing devices can lose access.</li>
        <li>Use synthetic, non-confidential information. Do not upload real supplier documents.</li>
        <li>The demo allows two sourcing cases per visitor, four quotations per case and ten saved selection notes per case.</li>
        <li>Extraction and assistant requests share a limited AI allowance. If a limit or temporary interruption is reported, follow the message on the affected screen.</li>
      </ul></div></details>
    </section>
  </section>;
}
