import type { CaseRead } from '../../api/types';
import { Icon } from '../../components/Icon';
import { formatDecimal } from './format';

export function CaseList({ items, onOpen }: { items: CaseRead[]; onOpen: (item: CaseRead) => void }) {
  return <div className="panel case-list"><table>
    <caption className="sr-only">Your saved sourcing cases</caption>
    <thead><tr><th scope="col">Sourcing case</th><th scope="col">Status</th><th scope="col" className="numeric">Quantity</th><th scope="col" className="numeric">Budget</th><th scope="col">Updated</th><th scope="col"><span className="sr-only">Action</span></th></tr></thead>
    <tbody>{items.map((item) => <tr key={item.id}>
      <th scope="row" className="case-name"><div className="case-name-content"><span className="case-icon"><Icon name="fabric" /></span><div><strong>{item.name}</strong><span className="table-meta">{item.requirement.textile_specification.construction} · Synthetic demo</span></div></div></th>
      <td data-label="Status"><span className="badge badge-muted">{item.status === 'draft' ? 'Draft' : item.status}</span></td>
      <td data-label="Quantity" className="numeric">{formatDecimal(item.requirement.quantity)}<span className="table-meta">metres</span></td>
      <td data-label="Budget" className="numeric">{formatDecimal(item.requirement.maximum_budget_amount)}<span className="table-meta">{item.requirement.currency}</span></td>
      <td data-label="Updated"><time dateTime={item.updated_at}>{new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(item.updated_at))}</time></td>
      <td className="case-action"><button type="button" className="button button-secondary" aria-label={`Open requirements for ${item.name}`} onClick={() => onOpen(item)}>Open requirements<Icon name="arrow" size={16} /></button></td>
    </tr>)}</tbody>
  </table></div>;
}
